#!/bin/bash

echo "Testing AI Portfolio API..."
echo

echo "1. Health Check:"
curl -X GET "http://localhost:8000/health"
echo -e "\n"

echo "2. Root Endpoint:"
curl -X GET "http://localhost:8000/"
echo -e "\n"

echo "3. Available Topics:"
curl -X GET "http://localhost:8000/api/topics"
echo -e "\n"

echo "4. Chat Test (AI Response):"
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about your experience with AI tools"}'
echo -e "\n"

echo "5. Another Chat Test:"
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What projects have you worked on?"}'
echo -e "\n"