import json
import os
from unittest.mock import patch, mock_open, MagicMock
import pytest

from chat import load_portfolio_data, Message, ChatRequest, handler


class TestLoadPortfolioData:
    def test_load_portfolio_data_success_and_fallback(self):
        """Test successful loading and fallback behavior"""
        # Test successful loading
        mock_data = {"about_me": {"intro": "Test intro"}, "projects": []}
        
        with patch("builtins.open", mock_open(read_data=json.dumps(mock_data))):
            result = load_portfolio_data()
            
        assert result == mock_data
        
        # Test file not found fallback
        with patch("builtins.open", side_effect=FileNotFoundError()):
            result = load_portfolio_data()
            
        assert result == {"about_me": {"intro": "Portfolio data not found"}}
        
        # Test invalid JSON fallback
        with patch("builtins.open", mock_open(read_data="invalid json")):
            result = load_portfolio_data()
            
        assert result == {"about_me": {"intro": "Portfolio data not found"}}


class TestPydanticModels:
    def test_pydantic_model_validation(self):
        """Test Pydantic model validation for Message and ChatRequest"""
        # Test Message model
        msg = Message(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"
        
        # Test ChatRequest with history
        messages = [Message(role="user", content="Hi")]
        request = ChatRequest(message="How are you?", history=messages)
        
        assert request.message == "How are you?"
        assert len(request.history) == 1
        assert request.history[0].role == "user"
        
        # Test ChatRequest without history (default empty list)
        request_no_history = ChatRequest(message="Hello")
        assert request_no_history.message == "Hello"
        assert request_no_history.history == []


class TestHTTPHandler:
    def _create_mock_handler(self):
        """Helper to create a mock handler with necessary attributes"""
        # Create handler without calling constructor that sets up connections
        request_handler = object.__new__(handler)
        request_handler.rfile = MagicMock()
        request_handler.wfile = MagicMock()
        request_handler.headers = {}
        request_handler.send_response = MagicMock()
        request_handler.send_header = MagicMock()
        request_handler.end_headers = MagicMock()
        return request_handler

    @patch('chat.OpenAI')
    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt template: {portfolio_data}"))
    def test_successful_post_request_flow(self, mock_load_portfolio, mock_openai):
        """Test the complete happy path: valid request → OpenAI call → successful response"""
        # Setup mocks
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Test response"
        mock_response.choices[0].finish_reason = "stop"
        mock_client.chat.completions.create.return_value = mock_response
        
        # Create handler and mock request
        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': '25'}
        
        test_data = json.dumps({"message": "Hello"}).encode()
        request_handler.rfile.read.return_value = test_data
        
        # Capture written response
        written_data = []
        request_handler.wfile.write = lambda data: written_data.append(data)
        
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test_key'}):
            request_handler.do_POST()
        
        # Verify response
        request_handler.send_response.assert_called_with(200)
        assert mock_client.chat.completions.create.called
        
        # Verify response data
        response_json = json.loads(written_data[0].decode('utf-8'))
        assert response_json['response'] == "Test response"

    @patch('chat.OpenAI')
    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt: {portfolio_data}"))
    def test_token_limit_retry_logic(self, mock_load_portfolio, mock_openai):
        """Test that truncated responses trigger retry with more tokens"""
        # Setup mocks
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        
        # First response is truncated
        first_response = MagicMock()
        first_response.choices[0].finish_reason = "length"
        
        # Second response is complete
        second_response = MagicMock()
        second_response.choices[0].message.content = "Complete response"
        second_response.choices[0].finish_reason = "stop"
        
        # Mock client to return responses in sequence
        mock_client.chat.completions.create.side_effect = [first_response, second_response]
        
        # Create handler and mock request
        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': '25'}
        
        test_data = json.dumps({"message": "Hello"}).encode()
        request_handler.rfile.read.return_value = test_data
        
        written_data = []
        request_handler.wfile.write = lambda data: written_data.append(data)
        
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test_key'}):
            request_handler.do_POST()
        
        # Verify two calls were made (initial + retry)
        assert mock_client.chat.completions.create.call_count == 2
        
        # Verify first call used 200 tokens, second used 300
        calls = mock_client.chat.completions.create.call_args_list
        assert calls[0][1]['max_tokens'] == 200
        assert calls[1][1]['max_tokens'] == 300
        
        # Verify final response
        response_json = json.loads(written_data[0].decode('utf-8'))
        assert response_json['response'] == "Complete response"

    @patch('chat.OpenAI')
    @patch('chat.load_portfolio_data')
    def test_error_handling_returns_500(self, mock_load_portfolio, mock_openai):
        """Test that exceptions properly return 500 status with error JSON and CORS headers"""
        # Setup mocks to cause an exception
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_openai.side_effect = Exception("OpenAI API error")
        
        # Create handler and mock request
        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': '25'}
        
        test_data = json.dumps({"message": "Hello"}).encode()
        request_handler.rfile.read.return_value = test_data
        
        written_data = []
        request_handler.wfile.write = lambda data: written_data.append(data)
        
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test_key'}):
            request_handler.do_POST()
        
        # Verify 500 response
        request_handler.send_response.assert_called_with(500)
        
        # Verify CORS headers are set
        header_calls = request_handler.send_header.call_args_list
        headers_set = {call[0][0]: call[0][1] for call in header_calls}
        assert headers_set['Access-Control-Allow-Origin'] == '*'
        assert headers_set['Content-Type'] == 'application/json'
        
        # Verify error response format
        response_json = json.loads(written_data[0].decode('utf-8'))
        assert 'error' in response_json
        assert 'OpenAI API error' in response_json['error']

    def test_options_cors_headers(self):
        """Test OPTIONS request for CORS preflight"""
        request_handler = self._create_mock_handler()
        
        request_handler.do_OPTIONS()
        
        # Verify 200 response
        request_handler.send_response.assert_called_with(200)
        
        # Verify CORS headers are set
        header_calls = request_handler.send_header.call_args_list
        headers_set = {call[0][0]: call[0][1] for call in header_calls}
        
        assert headers_set['Access-Control-Allow-Origin'] == '*'
        assert headers_set['Access-Control-Allow-Methods'] == 'POST, OPTIONS'
        assert headers_set['Access-Control-Allow-Headers'] == 'Content-Type'
        
        # Verify end_headers was called
        request_handler.end_headers.assert_called_once()

    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt template: {portfolio_data}"))
    def test_system_prompt_template_substitution(self, mock_load_portfolio):
        """Test that portfolio data gets properly injected into system prompt"""
        mock_portfolio_data = {"about_me": {"intro": "Test intro"}, "projects": ["Project 1"]}
        mock_load_portfolio.return_value = mock_portfolio_data
        
        # We need to test the template substitution logic indirectly
        # by checking what would be passed to OpenAI
        with patch('chat.OpenAI') as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = "Response"
            mock_response.choices[0].finish_reason = "stop"
            mock_client.chat.completions.create.return_value = mock_response
            
            request_handler = self._create_mock_handler()
            request_handler.headers = {'Content-Length': '25'}
            
            test_data = json.dumps({"message": "Hello"}).encode()
            request_handler.rfile.read.return_value = test_data
            
            request_handler.wfile.write = MagicMock()
            
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'test_key'}):
                request_handler.do_POST()
            
            # Verify OpenAI was called and check the system message
            assert mock_client.chat.completions.create.called
            call_args = mock_client.chat.completions.create.call_args[1]
            messages = call_args['messages']
            
            # First message should be system prompt with portfolio data
            assert messages[0]['role'] == 'system'
            system_content = messages[0]['content']
            
            # Verify portfolio data is in the system prompt
            assert 'Test intro' in system_content
            assert 'Project 1' in system_content

    @patch('chat.OpenAI') 
    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt: {portfolio_data}"))
    def test_conversation_history_handling(self, mock_load_portfolio, mock_openai):
        """Test that chat history gets properly added to OpenAI messages"""
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Response with history"
        mock_response.choices[0].finish_reason = "stop"
        mock_client.chat.completions.create.return_value = mock_response
        
        # Create request with conversation history
        history = [
            Message(role="user", content="Previous question"),
            Message(role="assistant", content="Previous answer")
        ]
        request_data = {
            "message": "Current question",
            "history": [{"role": msg.role, "content": msg.content} for msg in history]
        }
        
        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': str(len(json.dumps(request_data)))}
        
        test_data = json.dumps(request_data).encode()
        request_handler.rfile.read.return_value = test_data
        
        request_handler.wfile.write = MagicMock()
        
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test_key'}):
            request_handler.do_POST()
        
        # Verify OpenAI was called with correct message structure
        assert mock_client.chat.completions.create.called
        call_args = mock_client.chat.completions.create.call_args[1]
        messages = call_args['messages']
        
        # Should have: system prompt + history + current message
        assert len(messages) == 4
        assert messages[0]['role'] == 'system'
        assert messages[1]['role'] == 'user'
        assert messages[1]['content'] == 'Previous question'
        assert messages[2]['role'] == 'assistant' 
        assert messages[2]['content'] == 'Previous answer'
        assert messages[3]['role'] == 'user'
        assert messages[3]['content'] == 'Current question'