import json
import os
from unittest.mock import patch, mock_open, MagicMock

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
        request_handler = object.__new__(handler)
        request_handler.rfile = MagicMock()
        request_handler.wfile = MagicMock()
        request_handler.headers = {}
        request_handler.send_response = MagicMock()
        request_handler.send_header = MagicMock()
        request_handler.end_headers = MagicMock()
        return request_handler

    def _make_mock_response(self, text="Test response", stop_reason="end_turn"):
        mock_response = MagicMock()
        mock_response.stop_reason = stop_reason
        mock_response.content = [MagicMock(text=text)]
        return mock_response

    @patch('chat.anthropic.Anthropic')
    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt template: {portfolio_data}"))
    def test_successful_post_request_flow(self, mock_load_portfolio, mock_anthropic):
        """Test the complete happy path: valid request → Anthropic call → successful response"""
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value = self._make_mock_response("Test response")

        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': '25'}

        test_data = json.dumps({"message": "Hello"}).encode()
        request_handler.rfile.read.return_value = test_data

        written_data = []
        request_handler.wfile.write = lambda data: written_data.append(data)

        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test_key'}):
            request_handler.do_POST()

        request_handler.send_response.assert_called_with(200)
        assert mock_client.messages.create.called

        response_json = json.loads(written_data[0].decode('utf-8'))
        assert response_json['response'] == "Test response"

    @patch('chat.anthropic.Anthropic')
    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt: {portfolio_data}"))
    def test_token_limit_retry_logic(self, mock_load_portfolio, mock_anthropic):
        """Test that truncated responses trigger retry with more tokens"""
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client

        first_response = self._make_mock_response(stop_reason="max_tokens")
        second_response = self._make_mock_response("Complete response", stop_reason="end_turn")
        mock_client.messages.create.side_effect = [first_response, second_response]

        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': '25'}

        test_data = json.dumps({"message": "Hello"}).encode()
        request_handler.rfile.read.return_value = test_data

        written_data = []
        request_handler.wfile.write = lambda data: written_data.append(data)

        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test_key'}):
            request_handler.do_POST()

        assert mock_client.messages.create.call_count == 2

        calls = mock_client.messages.create.call_args_list
        assert calls[0][1]['max_tokens'] == 200
        assert calls[1][1]['max_tokens'] == 300

        response_json = json.loads(written_data[0].decode('utf-8'))
        assert response_json['response'] == "Complete response"

    @patch('chat.anthropic.Anthropic')
    @patch('chat.load_portfolio_data')
    def test_error_handling_returns_500(self, mock_load_portfolio, mock_anthropic):
        """Test that exceptions properly return 500 status with error JSON and CORS headers"""
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_anthropic.side_effect = Exception("Anthropic API error")

        request_handler = self._create_mock_handler()
        request_handler.headers = {'Content-Length': '25'}

        test_data = json.dumps({"message": "Hello"}).encode()
        request_handler.rfile.read.return_value = test_data

        written_data = []
        request_handler.wfile.write = lambda data: written_data.append(data)

        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test_key'}):
            request_handler.do_POST()

        request_handler.send_response.assert_called_with(500)

        header_calls = request_handler.send_header.call_args_list
        headers_set = {call[0][0]: call[0][1] for call in header_calls}
        assert headers_set['Access-Control-Allow-Origin'] == '*'
        assert headers_set['Content-Type'] == 'application/json'

        response_json = json.loads(written_data[0].decode('utf-8'))
        assert 'error' in response_json
        assert 'Anthropic API error' in response_json['error']

    def test_options_cors_headers(self):
        """Test OPTIONS request for CORS preflight"""
        request_handler = self._create_mock_handler()

        request_handler.do_OPTIONS()

        request_handler.send_response.assert_called_with(200)

        header_calls = request_handler.send_header.call_args_list
        headers_set = {call[0][0]: call[0][1] for call in header_calls}

        assert headers_set['Access-Control-Allow-Origin'] == '*'
        assert headers_set['Access-Control-Allow-Methods'] == 'POST, OPTIONS'
        assert headers_set['Access-Control-Allow-Headers'] == 'Content-Type'

        request_handler.end_headers.assert_called_once()

    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt template: {portfolio_data}"))
    def test_system_prompt_template_substitution(self, mock_load_portfolio):
        """Test that portfolio data gets properly injected into system prompt"""
        mock_portfolio_data = {"about_me": {"intro": "Test intro"}, "projects": ["Project 1"]}
        mock_load_portfolio.return_value = mock_portfolio_data

        with patch('chat.anthropic.Anthropic') as mock_anthropic:
            mock_client = MagicMock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.return_value = self._make_mock_response("Response")

            request_handler = self._create_mock_handler()
            request_handler.headers = {'Content-Length': '25'}

            test_data = json.dumps({"message": "Hello"}).encode()
            request_handler.rfile.read.return_value = test_data

            request_handler.wfile.write = MagicMock()

            with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test_key'}):
                request_handler.do_POST()

            assert mock_client.messages.create.called
            call_args = mock_client.messages.create.call_args[1]
            system_content = call_args['system']

            assert 'Test intro' in system_content
            assert 'Project 1' in system_content

    @patch('chat.anthropic.Anthropic')
    @patch('chat.load_portfolio_data')
    @patch('builtins.open', mock_open(read_data="System prompt: {portfolio_data}"))
    def test_conversation_history_handling(self, mock_load_portfolio, mock_anthropic):
        """Test that chat history gets properly added to Anthropic messages"""
        mock_load_portfolio.return_value = {"about_me": {"intro": "Test"}}
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value = self._make_mock_response("Response with history")

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

        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test_key'}):
            request_handler.do_POST()

        assert mock_client.messages.create.called
        call_args = mock_client.messages.create.call_args[1]
        messages = call_args['messages']

        # Should have: history + current message (system is a top-level param)
        assert len(messages) == 3
        assert messages[0]['role'] == 'user'
        assert messages[0]['content'] == 'Previous question'
        assert messages[1]['role'] == 'assistant'
        assert messages[1]['content'] == 'Previous answer'
        assert messages[2]['role'] == 'user'
        assert messages[2]['content'] == 'Current question'
