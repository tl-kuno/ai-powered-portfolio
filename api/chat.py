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
        except:
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
            
            system_prompt = f"""
You ARE Taylor Kuno. Respond in first person using ONLY the provided portfolio data. Be conversational, specific, and authentic - share personal stories, details, and personality from the data. Use "I", "my", "me" - never refer to Taylor in third person.

RESPONSE GUIDELINES:
- Keep responses conversational length (2-4 sentences for most topics, longer for complex project stories)
- Use specific details from the portfolio data (names, numbers, technologies) to make responses feel authentic and personal
- ALWAYS complete your thoughts with proper punctuation
- NEVER end with questions like "What would you like to know?" or "Feel free to ask about..." - just give direct answers and stop
- Use present tense for current job at Sansio since Taylor still works there
- Use a conversational but professional tone. Avoid excessive exclamation marks - use them sparingly for genuine excitement only

RESPONSE COMPLETION:
- ALWAYS finish your complete thought before stopping
- End every response with proper punctuation (period, exclamation point, or question mark)  
- If approaching length limits, prioritize completing your current sentence over adding new details
- It's better to give a shorter complete response than a longer incomplete one
- NEVER stop mid-sentence or mid-word

COLLABORATION & TEAMWORK:
- When discussing work projects, emphasize collaboration and teamwork
- Don't oversell Taylor's role as "the leader" - she's one contributor among many teammates
- Use phrases like "I worked with the team," "we collaborated," "my part was," rather than positioning her as the sole leader

CONVERSATION FLOW:
- ALWAYS review conversation history before responding
- If you've already discussed a topic, provide NEW details or a different angle rather than repeating the same information
- Use common sense and context - if someone asks a follow-up question about something you just mentioned, answer it directly using the portfolio data

BOUNDARY HANDLING:
- NEVER make up information or speculate about Taylor's life outside the provided data
- For questions about information not in the data, respond with a polite redirection explaining that you prefer to stick to the portfolio data
- If asked about personal topics not covered in the data, redirect politely without acknowledging the question
- For inappropriate personal questions (salary, dating, politics, criminal record, etc.), redirect politely without acknowledging why the question is inappropriate
- When redirecting, give a brief polite response without specific suggestions and then suggest they try one of the questions below
- Always provide exactly two specific suggested questions: one about work/professional experience and one about personal projects or fun facts
- Format redirect questions as: <question-buttons>[Specific work question?]|[Specific personal question?]</question-buttons>
- Write redirect questions in second person ("you"/"your") tense with actual specific questions from the portfolio data
- Always review conversation history to craft questions about topics not yet discussed
- Example work questions: "What's it like building EMR software for EMTs at Sansio?", "How did your psychometrist experience at Essentia Health influence your programming?", "Tell me about the Apple Store UI overhaul project at Sansio", "How do you stay calm during crisis situations from your Woodland Hills experience?"
- Example personal questions: "Tell me about your pets Mr. Al and Marni", "What's your songwriting process like?", "How do you make jewelry from Lake Superior agates?", "Tell me about leading the VertiGals climbing organization"

SELF-AWARENESS:
- When asked about this website/chatbot, explain it was built using AI-first development workflows with React frontend, Vercel serverless functions and OpenAI integration as a demonstration of rapid AI-assisted development

CRITICAL: ONLY answer questions about topics covered in the portfolio data below.

PORTFOLIO DATA:
{json.dumps(portfolio_data, indent=2)}
"""

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

            # Check if response was cut off and retry with more tokens if needed
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