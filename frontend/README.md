# Ask Kuno - AI-Powered Portfolio Frontend

Interactive portfolio website with AI chat functionality built with React, TypeScript, and Vite.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── ChatSection.tsx   # Main chat interface
│   ├── PortfolioSection.tsx # Portfolio content
│   ├── ExperienceCard.tsx   # Individual experience cards
│   └── *.css            # Component styles
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## 🎨 Key Features

- **AI Chat Interface**: Interactive chat with portfolio assistant
- **Smooth Scroll Animation**: Chat-to-portfolio transition
- **Responsive Design**: Mobile-first responsive layout
- **Experience Cards**: Interactive portfolio cards with suggested questions
- **External Links**: Dropdown menus for multiple project links
- **Collapsed Header**: Sticky header when scrolling

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling with custom properties
- **Modern ES6+** - Latest JavaScript features

## 📱 Responsive Breakpoints

- **Desktop**: 769px and up
- **Mobile**: 768px and below

## 🎯 Component Overview

### ChatSection

- Main landing section with profile and chat interface
- Handles scroll-based animations and state management
- Collapsed header functionality

### PortfolioSection

- Portfolio content organized by experience type
- Toggle between different views
- Section-based navigation

### ExperienceCard

- Reusable card component for experiences
- Supports single links and dropdown menus
- Interactive question buttons

## 🚀 Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Domain

Production site: [ask-kuno.dev](https://ask-kuno.dev)

## 📝 Notes

- Chat functionality requires backend API at `http://localhost:8000`
- All animations use CSS transforms for smooth performance
- Mobile-optimized touch interactions
- SEO-optimized with structured data
