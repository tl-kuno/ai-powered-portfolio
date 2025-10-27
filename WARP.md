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

# Set environment variables in Vercel dashboard:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - PINECONE_INDEX_NAME (optional, defaults to "portfolio-embeddings")
```

### Embeddings Management
```bash
# Upload portfolio chunks to Pinecone (run after portfolio.json changes)
export $(cat .env | xargs) && python3 scripts/upload_embeddings.py

# Test retrieval with sample queries
export $(cat .env | xargs) && python3 scripts/test_retrieval.py
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
- **Vector Database**: Pinecone for semantic search over portfolio content
- **Embeddings**: OpenAI text-embedding-3-small (512 dimensions)
- **Styling**: Vanilla CSS3 with custom properties (no CSS frameworks)
- **Testing**: Vitest + React Testing Library (frontend), pytest (backend)

### Key Architectural Patterns

#### AI Chat System with Vector Retrieval
The AI assistant responds **in first person as Taylor Kuno** using vector embeddings stored in Pinecone:

**Data Flow:**
1. Portfolio content is chunked and embedded via `scripts/upload_embeddings.py`
2. User query is embedded using OpenAI's text-embedding-3-small
3. Pinecone retrieves the bio chunk (always) + top 3 relevant chunks
4. System prompt (`api/system_prompt.txt`) receives bio for voice consistency + relevant stories
5. Chat history is limited to last 6 messages to control token usage

**Chunking Strategy:**
- Bio/intro combined into single voice anchor chunk
- Work projects kept as complete stories with all context
- Healthcare roles preserved with full narratives
- Personal content grouped logically (pets, creative pursuits, etc.)
- Each chunk maintains Taylor's conversational writing style

**Response Guidelines:**
- Answers questions only about topics in the portfolio data
- Provides contextual follow-up question suggestions using `<question-buttons>` XML tags
- Uses streaming responses with typing effect on frontend
- Debug mode includes chunk IDs, types, and similarity scores

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
Notes:
- `.slice(1)` skips the initial greeting message to reduce token usage
- Backend limits history to last 6 messages to control context window size
- Bio chunk is always included to maintain voice consistency across conversation

### File Structure Highlights

#### Frontend (`frontend/src/`)
- `App.tsx` - Root component with portfolio toggle state
- `components/ChatSection.tsx` - Chat interface with scroll animations, streaming responses, command history (arrow keys)
- `components/PortfolioSection.tsx` - Carousel-based portfolio display with hardcoded experience data
- `components/ExperienceCard.tsx` - Reusable card with suggested questions and optional external links/dropdown
- `tests/` - Test files using Vitest + React Testing Library

#### Backend (`api/`)
- `chat.py` - Vercel serverless function handler with Pinecone vector retrieval
- `system_prompt.txt` - AI system prompt template with `{bio_content}` and `{relevant_stories}` placeholders
- `requirements.txt` - Python dependencies (openai, pinecone, pydantic, httpx)
- `test_chat.py` - pytest test suite

#### Scripts (`scripts/`)
- `upload_embeddings.py` - Chunks portfolio.json and uploads embeddings to Pinecone
- `test_retrieval.py` - Tests vector retrieval with sample queries

#### Configuration
- `data/portfolio.json` - Single source of truth for all portfolio content (AI context + display data)
- `vercel.json` - Vercel routing and build configuration
- `frontend/vite.config.ts` - Vite configuration with Vitest setup
- `frontend/eslint.config.js` - ESLint configuration (TypeScript ESLint + React hooks)

### Important Implementation Details

#### Serverless Function Structure
`api/chat.py` uses Vercel's Python runtime with `BaseHTTPRequestHandler`:
- Methods: `do_POST()` for chat requests, `do_OPTIONS()` for CORS preflight
- Embeds user query using OpenAI text-embedding-3-small (512 dimensions)
- Queries Pinecone for bio chunk (always) + top 3 relevant chunks using cosine similarity
- Formats system prompt with bio (voice anchor) and relevant stories
- Limits chat history to last 6 messages
- Implements token limit retry logic (200 → 300 tokens if cut off)
- Returns debug info with chunk IDs, types, and similarity scores

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
- Embedding dimensions (512) - Changing requires recreating Pinecone index and re-uploading all chunks

### Do Not Modify Without Care
- `<question-buttons>` XML format - Changing this requires coordinated updates to system prompt, frontend parsing, and test cases
- Command history limit (5 items) - Intentional constraint to prevent state bloat
- Chat history limit (6 messages) - Backend constraint to control context window
- Token limits (200/300) - Tuned for response quality vs. cost tradeoff
- Chunk retrieval count (1 bio + 3 relevant) - Balances context quality with token usage
- Chunking strategy in `upload_embeddings.py` - Preserves Taylor's conversational voice

### Security Notes
- NEVER use `dangerouslySetInnerHTML` for rendering AI responses
- NEVER commit API keys (`OPENAI_API_KEY`, `PINECONE_API_KEY`) - must be set in Vercel dashboard and `.env` for local dev
- CORS headers are open (`*`) since this is a public portfolio site
- Pinecone index uses serverless (free tier compatible) with cosine metric

### Testing Philosophy
Tests focus on user interactions rather than implementation details:
- Frontend: Click flows, message sending, view navigation, loading states
- Backend: HTTP request/response handling, data validation, OpenAI retry logic, CORS headers

## Project Context

This portfolio was built using AI-first development workflows (Claude AI + Amazon Q) to demonstrate rapid AI-assisted development capabilities. The codebase is approximately 100% AI-generated with minimal hand-edits, intentionally designed to showcase modern agentic coding tools.

The site serves as both a portfolio and a meta-demonstration of the development approach used to create it.
