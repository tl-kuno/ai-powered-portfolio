import json
import os
import sys
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.main import app

client = TestClient(app)


def test_health_check():
    """Test the health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Portfolio API"}


def test_topics_endpoint():
    """Test the topics endpoint"""
    response = client.get("/api/topics")
    assert response.status_code == 200
    data = response.json()
    assert "topics" in data
    assert len(data["topics"]) > 0


@patch("requests.post")
@patch("builtins.open")
def test_chat_endpoint_success(mock_open, mock_post):
    """Test successful chat endpoint"""
    # Mock portfolio data
    mock_portfolio = {"about_me": {"intro": "Test intro"}}
    mock_open.return_value.__enter__.return_value.read.return_value = json.dumps(
        mock_portfolio
    )

    # Mock OpenAI API response
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Test response"}}]
    }
    mock_post.return_value = mock_response

    response = client.post("/api/chat", json={"message": "Hello"})
    assert response.status_code == 200
    assert "response" in response.json()


@patch("builtins.open", side_effect=FileNotFoundError())
def test_chat_endpoint_missing_file(mock_open):
    """Test chat endpoint with missing portfolio file"""
    response = client.post("/api/chat", json={"message": "Hello"})
    assert response.status_code == 500
    assert "Portfolio data not found" in response.json()["detail"]


def test_chat_endpoint_invalid_request():
    """Test chat endpoint with invalid request"""
    response = client.post("/api/chat", json={})
    assert response.status_code == 422  # Validation error
