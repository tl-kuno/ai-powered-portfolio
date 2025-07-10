from http.server import BaseHTTPRequestHandler
import json
import os
from typing import List

from openai import OpenAI
from pydantic import BaseModel


# Load portfolio data
def load_portfolio_data():
    import os
    # Try different possible paths
    possible_paths = [
        "data/portfolio.json",
        "../data/portfolio.json",
        "../../data/portfolio.json",
        "/var/task/data/portfolio.json"
    ]

    for path in possible_paths:
        try:
            if os.path.exists(path):
                with open(path, "r") as f:
                    return json.load(f)
        except BaseException:
            continue

    # Fallback - return minimal data
    return {"about_me": {"intro": "Portfolio data not found"}}


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

            # Load portfolio data
            portfolio_data = load_portfolio_data()

            # Initialize OpenAI client
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

            # Load system prompt from file
            with open('api/system_prompt.txt', 'r') as f:
                system_prompt_template = f.read()

            system_prompt = system_prompt_template.format(
                portfolio_data=json.dumps(portfolio_data, indent=2)
            )

            # Build message history
            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history
            for msg in chat_request.history:
                messages.append({"role": msg.role, "content": msg.content})

            # Add current message
            messages.append({"role": "user", "content": chat_request.message})

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=120,
                temperature=0.6,
            )

            # Check if response was cut off and retry with more tokens if
            # needed
            if response.choices[0].finish_reason == "length":
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    max_tokens=150,
                    temperature=0.6,
                )

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            response_data = {"response": response.choices[0].message.content}
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
