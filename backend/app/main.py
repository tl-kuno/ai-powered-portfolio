import os
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Portfolio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"message": "AI Portfolio API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/chat")
async def chat_with_portfolio(request: ChatRequest):
    try:
        # Load portfolio data
        with open("../data/portfolio.json", "r") as f:
            portfolio_data = json.load(f)
        
        system_prompt = f"""
You are representing Taylor Kuno, a software developer. Use ONLY the provided portfolio information to answer questions.
If information isn't available, say so politely. Be professional but approachable.

Portfolio Data: {json.dumps(portfolio_data, indent=2)}
"""
        
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            "max_tokens": 300,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {response.text}")
        
        result = response.json()
        return {"response": result["choices"][0]["message"]["content"]}
    
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Portfolio data not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.get("/api/topics")
def get_topics():
    return {
        "topics": [
            "Work experience and roles",
            "Technical skills and technologies",
            "Side projects and hobbies",
            "Education and background",
            "Career goals and interests"
        ]
    }