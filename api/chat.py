from http.server import BaseHTTPRequestHandler
import json
import os
from typing import List, Dict, Any, Optional

from openai import OpenAI
from pinecone import Pinecone
from pydantic import BaseModel


# Configuration
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 512
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "portfolio-embeddings")


def get_relevant_chunks(query: str, openai_client: OpenAI, pinecone_index: Any, include_debug: bool = True) -> Dict[str, Any]:
    """
    Retrieve relevant portfolio chunks:
    - Always include bio chunk
    - Retrieve 3 other relevant chunks based on query
    """
    # Generate embedding for user query
    query_embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query,
        dimensions=EMBEDDING_DIMENSION
    ).data[0].embedding
    
    # Always retrieve bio chunk
    bio_results = pinecone_index.query(
        vector=query_embedding,
        top_k=1,
        filter={"type": "bio"},
        include_metadata=True
    )
    
    # Retrieve 3 other relevant chunks (excluding bio)
    other_results = pinecone_index.query(
        vector=query_embedding,
        top_k=3,
        filter={"type": {"$ne": "bio"}},
        include_metadata=True
    )
    
    # Extract content and build debug info
    bio_content = ""
    bio_debug = None
    if bio_results.matches:
        match = bio_results.matches[0]
        bio_content = match.metadata.get("content", "")
        if include_debug:
            bio_debug = {
                "id": match.id,
                "type": match.metadata.get("type", ""),
                "score": float(match.score)
            }
    
    relevant_chunks = []
    debug_chunks = []
    for match in other_results.matches:
        content = match.metadata.get("content", "")
        if content:
            relevant_chunks.append(content)
            if include_debug:
                debug_chunks.append({
                    "id": match.id,
                    "type": match.metadata.get("type", ""),
                    "score": float(match.score)
                })
    
    return {
        "bio_content": bio_content,
        "relevant_chunks": relevant_chunks,
        "debug": {"bio": bio_debug, "chunks": debug_chunks} if include_debug else None
    }


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))

            chat_request = ChatRequest(**body)

            # Initialize clients
            openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)

            # Retrieve relevant chunks
            retrieval_result = get_relevant_chunks(
                chat_request.message,
                openai_client,
                pinecone_index,
                include_debug=True
            )

            # Load system prompt from file
            with open('api/system_prompt.txt', 'r') as f:
                system_prompt_template = f.read()

            # Format relevant chunks for prompt
            relevant_stories = "\n\n---\n\n".join(retrieval_result["relevant_chunks"])

            system_prompt = system_prompt_template.format(
                bio_content=retrieval_result["bio_content"],
                relevant_stories=relevant_stories
            )

            # Build message history (keep only last 6 messages)
            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history (last 6 messages only)
            recent_history = chat_request.history[-6:] if len(chat_request.history) > 6 else chat_request.history
            for msg in recent_history:
                messages.append({"role": msg.role, "content": msg.content})

            # Add current message
            messages.append({"role": "user", "content": chat_request.message})

            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=200,
                temperature=0.6,
            )

            # Check if response was cut off and retry with more tokens if needed
            if response.choices[0].finish_reason == "length":
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    max_tokens=300,
                    temperature=0.6,
                )

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            response_data = {
                "response": response.choices[0].message.content,
                "debug": retrieval_result.get("debug")
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            import traceback
            print(f"Error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")

            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            error_data = {"error": f"Error processing request: {str(e)}"}
            self.wfile.write(json.dumps(error_data).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
