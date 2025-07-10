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

## 🧪 API Testing

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
