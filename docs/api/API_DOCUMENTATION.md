# AI Portfolio API Documentation

## Overview
FastAPI backend that powers an AI-driven portfolio chatbot. The API integrates with OpenAI's GPT-3.5-turbo to provide conversational responses about Taylor Kuno's professional background.

## Base URL
```
http://localhost:8000
```

## Authentication
- OpenAI API key required in environment variables
- No authentication required for API endpoints

## Endpoints

### GET /
**Description:** Root endpoint returning API information
**Response:**
```json
{
  "message": "AI Portfolio API"
}
```

### GET /health
**Description:** Health check endpoint
**Response:**
```json
{
  "status": "healthy"
}
```

### GET /api/topics
**Description:** Returns available conversation topics
**Response:**
```json
{
  "topics": [
    "Work experience and roles",
    "Technical skills and technologies", 
    "Side projects and hobbies",
    "Education and background",
    "Career goals and interests"
  ]
}
```

### POST /api/chat
**Description:** Chat with AI portfolio assistant
**Request Body:**
```json
{
  "message": "Tell me about your experience with React"
}
```
**Response:**
```json
{
  "response": "I have extensive experience with React, having used it daily in my current role as a Software Developer..."
}
```

**Error Responses:**
- `500`: Portfolio data not found
- `500`: OpenAI API error
- `422`: Invalid request format

## CORS Configuration
- Allowed origins: `http://localhost:3000`, `http://127.0.0.1:3000`
- Allowed methods: `GET`, `POST`
- Credentials: Enabled

## Interactive Documentation
Visit `http://localhost:8000/docs` for Swagger UI documentation