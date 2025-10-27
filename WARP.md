# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Frontend Development
```bash
# Install dependencies and start dev server
cd frontend
npm install
npm run dev          # Vite dev server (port 5173)

# Build, lint, and format
npm run build        # TypeScript compilation + Vite build
npm run lint         # ESLint
npm run format       # Prettier formatting
npm run preview      # Preview production build
```

### Testing
```bash
# Frontend tests (Vitest + React Testing Library)
cd frontend
npm test             # Run all tests
npm run test:ui      # Interactive test UI
npm run test:run     # Single test run
npx vitest run src/tests/ChatInput.test.tsx  # Run specific test

# Python API tests (pytest)
source venv/bin/activate
python -m pytest api/test_chat.py -v
python -m pytest api/test_chat.py --cov=api --cov-report=html  # With coverage
```

### API Development
```bash
# Start Vercel development server for serverless functions
vercel dev           # API functions (port 3000)

# Test chat endpoint
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "history": []}'
```

### Deployment
```bash
npm i -g vercel
vercel --prod        # Deploy to production

# Set OPENAI_API_KEY in Vercel dashboard
```

### Running Single Tests
```bash
# Frontend: specify the test file path
npx vitest run src/tests/ChatInput.test.tsx

# Python: use pytest with the test file path
python -m pytest api/test_chat.py::test_function_name -v
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python serverless functions on Vercel (not Express/Node)
- **AI Integration**: OpenAI GPT-4o-mini with streaming responses
- **Styling**: Vanilla CSS3 with custom properties (no CSS frameworks)
- **Testing**: Vitest + React Testing Library (frontend), pytest (backend)

### Key Architectural Patterns

#### AI Chat System
The AI assistant responds **in first person as Taylor Kuno** using portfolio data from `data/portfolio.json`. The system prompt (`api/system_prompt.txt`) injects this data and enforces conversational boundaries:
- Answers questions only about topics in the portfolio data
- Provides contextual follow-up question suggestions using `<question-buttons>` XML tags
- Uses streaming responses with typing effect on frontend

#### Component Communication via Custom Events
Components communicate through `window.dispatchEvent()` custom events rather than prop drilling:
- `ExperienceCard` and `PortfolioSection` dispatch `questionClick` events when users click suggested questions
- `ChatSection` listens for these events and automatically sends the question to the AI
- This pattern enables loosely coupled components across the chat/portfolio view boundary

#### State Management Strategy
Simple useState-based state management with no external libraries:
- `App.tsx`: Controls `showPortfolio` toggle between chat and portfolio views
- `ChatSection.tsx`: Manages messages, loading states, streaming text, and command history
- `PortfolioSection.tsx`: Manages carousel section navigation

#### Message History & Context
The chat maintains conversation history by sending previous messages to the API:
```typescript
history: messages.slice(1).map(msg => ({
  role: msg.isUser ? 'user' : 'assistant',
  content: msg.text
}))
```
Note: `.slice(1)` skips the initial greeting message to reduce token usage.

### File Structure Highlights

#### Frontend (`frontend/src/`)
- `App.tsx` - Root component with portfolio toggle state
- `components/ChatSection.tsx` - Chat interface with scroll animations, streaming responses, command history (arrow keys)
- `components/PortfolioSection.tsx` - Carousel-based portfolio display with hardcoded experience data
- `components/ExperienceCard.tsx` - Reusable card with suggested questions and optional external links/dropdown
- `tests/` - Test files using Vitest + React Testing Library

#### Backend (`api/`)
- `chat.py` - Vercel serverless function handler (HTTP request handler, not Flask/Express)
- `system_prompt.txt` - AI system prompt template with `{portfolio_data}` placeholder
- `requirements.txt` - Python dependencies (openai, pydantic, httpx)
- `test_chat.py` - pytest test suite

#### Configuration
- `data/portfolio.json` - Single source of truth for all portfolio content (AI context + display data)
- `vercel.json` - Vercel routing and build configuration
- `frontend/vite.config.ts` - Vite configuration with Vitest setup
- `frontend/eslint.config.js` - ESLint configuration (TypeScript ESLint + React hooks)

### Important Implementation Details

#### Serverless Function Structure
`api/chat.py` uses Vercel's Python runtime with `BaseHTTPRequestHandler`:
- Methods: `do_POST()` for chat requests, `do_OPTIONS()` for CORS preflight
- Loads `data/portfolio.json` on each request (serverless context)
- Formats system prompt by injecting portfolio data into template
- Implements token limit retry logic (200 → 300 tokens if cut off)

#### Streaming Response Pattern
Frontend simulates streaming with character-by-character display:
1. API returns complete response
2. `streamText()` function displays characters incrementally (20ms intervals)
3. Strips `<question-buttons>` tags during streaming to avoid visual glitches
4. Renders question buttons after streaming completes

#### Question Button Format
AI responses can include suggested questions in this XML format:
```
<question-buttons>[Question 1?]|[Question 2?]</question-buttons>
```
Frontend regex parses these and renders as clickable buttons.

#### Responsive Design Strategy
Mobile-first design with breakpoint at 768px:
- Mobile: 90vh containers, icon-only social links
- Desktop: 70vh containers, full social links with text
- Fixed height containers prevent layout overflow
- Touch-optimized swipe gestures for carousel navigation

## Critical Constraints

### Do Not Alter Without Explicit Permission
- `data/portfolio.json` structure - This is the source of truth for Taylor's professional and personal information and serves as writing samples so that the chat agent can respond in her tone. 

### Do Not Mofify Without Care
- `<question-buttons>` XML format - Changing this requires coordinated updates to system prompt, frontend parsing, and test cases
- Command history limit (5 items) - Intentional constraint to prevent state bloat
- Token limits (200/300) - Tuned for response quality vs. cost tradeoff

### Security Notes
- NEVER use `dangerouslySetInnerHTML` for rendering AI responses
- NEVER commit `OPENAI_API_KEY` - must be set in Vercel dashboard only
- CORS headers are open (`*`) since this is a public portfolio site

### Testing Philosophy
Tests focus on user interactions rather than implementation details:
- Frontend: Click flows, message sending, view navigation, loading states
- Backend: HTTP request/response handling, data validation, OpenAI retry logic, CORS headers

## Project Context

This portfolio was built using AI-first development workflows (Claude AI + Amazon Q) to demonstrate rapid AI-assisted development capabilities. The codebase is approximately 100% AI-generated with minimal hand-edits, intentionally designed to showcase modern agentic coding tools.

The site serves as both a portfolio and a meta-demonstration of the development approach used to create it.
