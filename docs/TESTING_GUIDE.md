# Testing Guide

## Test Coverage Summary
✅ **6/6 tests passing** - 100% endpoint coverage

## Test Categories

### Unit Tests
- **Health Check**: Verifies `/health` endpoint returns correct status
- **Root Endpoint**: Validates API welcome message
- **Topics Endpoint**: Ensures conversation topics are returned

### Integration Tests  
- **Successful Chat**: Mocks OpenAI API for successful responses
- **Missing File Error**: Tests error handling when portfolio.json is missing
- **Invalid Request**: Validates request body validation

### Error Handling Tests
- **OpenAI API Errors**: Tests handling of external API failures
- **File System Errors**: Tests missing portfolio data scenarios
- **Request Validation**: Tests malformed request handling

## Running Tests

### All Tests
```bash
cd backend
source ../venv/bin/activate
python -m pytest tests/ -v
```

### Specific Test
```bash
python -m pytest tests/test_main.py::test_chat_endpoint_success -v
```

### With Coverage Report
```bash
pip install pytest-cov
python -m pytest tests/ --cov=app --cov-report=html
```

## Test Structure
```
backend/tests/
├── __init__.py
└── test_main.py    # Main API endpoint tests
```

## Mocking Strategy
- **OpenAI API**: Mocked using `unittest.mock.patch`
- **File System**: Mocked for error scenarios
- **Environment Variables**: Handled via test client

## Current Test Results
- ✅ All endpoints tested
- ✅ Error scenarios covered
- ✅ Request/response validation
- ✅ External API integration mocked
- ⚠️ SSL warning (macOS LibreSSL) - non-blocking