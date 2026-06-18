from http.server import BaseHTTPRequestHandler
import json
import os
from typing import List

import anthropic
from pydantic import BaseModel


# Load portfolio data
def load_portfolio_data():
    try:
        with open("data/portfolio.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading portfolio data: {e}")
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
            has_real_data = bool(
                portfolio_data and portfolio_data != {'about_me': {'intro': 'Portfolio data not found'}}
            )
            print(f"Portfolio data loaded: {has_real_data}")
            print(f"Portfolio keys: {list(portfolio_data.keys()) if portfolio_data else 'None'}")

            # Initialize Anthropic client
            client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

            # Load system prompt from file
            with open('api/system_prompt.txt', 'r') as f:
                system_prompt_template = f.read()

            system_prompt = system_prompt_template.format(
                portfolio_data=json.dumps(portfolio_data, indent=2)
            )

            # Build message history
            messages = []

            # Add conversation history
            for msg in chat_request.history:
                messages.append({"role": msg.role, "content": msg.content})

            # Add current message
            messages.append({"role": "user", "content": chat_request.message})

            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                system=system_prompt,
                messages=messages,
                max_tokens=200,
                temperature=0.6,
            )

            # Check if response was cut off and retry with more tokens if
            # needed
            if response.stop_reason == "max_tokens":
                response = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    system=system_prompt,
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

            response_data = {"response": response.content[0].text}
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
