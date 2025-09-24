# AI-Powered Professional Portfolio

An intelligent portfolio website with AI-driven chat functionality, built using AI-first development workflows and deployed on Vercel.

## 🚀 Quick Start

### Development
```bash
# Install frontend dependencies
cd frontend
npm install

# Start development servers
npm run dev    # Frontend (port 5173)
vercel dev     # API functions (port 3000)
```

### Deployment
```bash
npm i -g vercel
vercel --prod
```

Set `OPENAI_API_KEY` in Vercel dashboard.

## 🏗️ Project Structure

```
ai-powered-portfolio/
├── api/                     # Vercel serverless functions
│   ├── chat.py             # AI chat endpoint
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ChatSection.tsx
│   │   │   ├── PortfolioSection.tsx
│   │   │   └── ExperienceCard.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/            # Static assets
│   └── package.json
├── data/
│   └── portfolio.json     # AI training data
├── vercel.json           # Vercel configuration
└── README.md
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python serverless functions on Vercel
- **AI**: OpenAI GPT-4o-mini
- **Styling**: CSS3 with custom properties
- **Deployment**: Vercel (frontend + serverless functions)

## 🎨 Key Features

### Chat Interface
- Interactive AI chat with portfolio assistant
- Streaming responses with typing effect
- Command history with arrow key navigation
- Question buttons parsed from AI responses
- Scroll-based animations and collapsed header

### Portfolio Display
- Experience cards organized by category
- Interactive suggested questions
- External links with dropdown menus
- Responsive mobile-first design

### AI Integration
- Contextual responses based on portfolio data
- Boundary handling for inappropriate questions
- Suggested follow-up questions
- Rate limiting and error handling

## 📱 Responsive Design

- **Mobile**: 768px and below (90vh containers, icon-only social links)
- **Desktop**: 769px and up (70vh containers, full social links)
- Touch-optimized interactions
- Fixed height containers prevent overflow

## 🔧 API Endpoints

### POST /api/chat
```json
{
  "message": "Tell me about your work at Sansio",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ]
}
```

Response:
```json
{
  "response": "AI response with optional <question-buttons>[Question?]</question-buttons>"
}
```

## 🌍 Environment Variables

Required in Vercel dashboard:
- `OPENAI_API_KEY` - Your OpenAI API key

## 🧪 Testing

### Frontend Tests (Vitest + React Testing Library)

```bash
# Run all frontend tests
cd frontend
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run src/tests/ChatInput.test.tsx

# Run with coverage
npm run test:coverage
```

### Python API Tests (pytest)

```bash
# Activate virtual environment and run API tests
source venv/bin/activate
python -m pytest api/test_chat.py -v

# Run with coverage
python -m pytest api/test_chat.py --cov=api --cov-report=html
```

### Test Suites

**Frontend Tests:**
1. **App Rendering** - Verifies main app component renders correctly with profile and chat sections
2. **Chat Input** - Tests input field functionality, typing, value updates, and clearing after message send
3. **Message Sending** - Tests message submission, API integration, user/AI message display, and loading states
4. **Navigation Between Views** - Tests switching between chat and portfolio sections, scroll behavior

**Python API Tests:**
1. **Portfolio Data Loading** - Tests successful data loading and fallback behavior for missing files
2. **Pydantic Model Validation** - Validates request/response data structures and type checking
3. **HTTP Handler - Success Flow** - Tests successful POST requests and JSON response handling
4. **HTTP Handler - Token Limits** - Tests retry logic when OpenAI token limits are exceeded
5. **HTTP Handler - Error Handling** - Tests 500 error responses for various failure scenarios
6. **HTTP Handler - CORS** - Tests OPTIONS requests and proper CORS header configuration
7. **System Prompt Templates** - Tests dynamic prompt generation with portfolio data substitution
8. **Conversation History** - Tests multi-turn conversation handling and message history management

### API Testing

```bash
# Test chat endpoint
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "history": []}'
```

## 📦 Build Commands

```bash
# Frontend development
cd frontend
npm run dev

# Frontend build
npm run build

# Preview production build
npm run preview

# Deploy to production
vercel --prod
```

## 🎯 Component Architecture

- **ChatSection**: Main chat interface with scroll animations
- **PortfolioSection**: Portfolio content organized by experience type
- **ExperienceCard**: Reusable cards with suggested questions

See `frontend/COMPONENTS.md` for detailed component documentation.

## 🚀 Production

Live site: [ask-kuno.dev](https://ask-kuno.dev)

## 📝 Development Notes

- Built using AI-first development workflows (Claude AI, Amazon Q)
- 10-day development timeline from concept to production
- Demonstrates rapid AI-assisted development capabilities
- All animations use CSS transforms for performance
- Mobile-optimized with touch interactions
