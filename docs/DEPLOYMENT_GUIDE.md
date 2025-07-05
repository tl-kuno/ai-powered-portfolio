# Deployment Guide

## Local Development Setup

### Prerequisites
- Python 3.9+
- Git
- OpenAI API key

### Setup Steps
```bash
# Clone repository
git clone https://github.com/tl-kuno/ai-powered-portfolio.git
cd ai-powered-portfolio

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run server
python run.py
```

### Verification
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Production Deployment Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Environment Variables:**
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: 8000 (or Railway default)

### Option 2: Render
1. Connect GitHub repository
2. Set build command: `pip install -r backend/requirements.txt`
3. Set start command: `cd backend && python run.py`
4. Add environment variable: `OPENAI_API_KEY`

### Option 3: Heroku
```bash
# Create Procfile in root
echo "web: cd backend && python run.py" > Procfile

# Deploy
heroku create your-app-name
heroku config:set OPENAI_API_KEY=your_key_here
git push heroku main
```

## Environment Configuration

### Required Variables
```bash
OPENAI_API_KEY=sk-...  # Your OpenAI API key
```

### Optional Variables
```bash
PORT=8000              # Server port (default: 8000)
HOST=0.0.0.0          # Server host (default: 127.0.0.1)
```

## Security Checklist
- [ ] OpenAI API key in environment variables (not code)
- [ ] .env file in .gitignore
- [ ] CORS origins restricted to your domain
- [ ] HTTPS enabled in production
- [ ] Error messages don't expose sensitive data

## Monitoring & Maintenance
- **Health Check**: GET /health endpoint
- **Logs**: Check server logs for errors
- **API Usage**: Monitor OpenAI API usage and costs
- **Updates**: Keep dependencies updated regularly

## Troubleshooting

### Common Issues
1. **Port in use**: Kill existing processes or change port
2. **OpenAI API errors**: Check API key and usage limits
3. **CORS errors**: Verify frontend origin in CORS settings
4. **File not found**: Ensure portfolio.json exists in data/

### Debug Commands
```bash
# Check server status
curl http://localhost:8000/health

# Test chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Run tests
python -m pytest tests/ -v
```