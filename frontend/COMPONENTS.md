# Component Documentation

## ChatSection

Main landing section with profile information and chat interface.

### Props

None - self-contained component

### State

- `messages`: Array of chat messages
- `inputValue`: Current input field value
- `isLoading`: Chat loading state
- `isCollapsed`: Header collapse state
- `scrollProgress`: Scroll animation progress
- `streamingText`: Real-time AI response streaming
- `commandHistory`: Previous user inputs (arrow key navigation)
- `historyIndex`: Current position in command history

### Key Features

- Scroll-based animations (scale/opacity)
- Collapsed header on scroll
- Streaming AI responses with typing effect
- Command history with arrow key navigation
- Question button rendering from AI responses
- AI disclaimer text
- Scroll hint to portfolio section
- Social media links (icon-only on mobile)

---

## PortfolioSection

Portfolio content organized by experience categories.

### Props

None - contains all portfolio data internally

### Data Structure

- `SOFTWARE_EXPERIENCE`: Current and past software development roles
- `HEALTHCARE_EXPERIENCE`: Healthcare background and transitions
- `PERSONAL_PROJECTS`: Side projects and technical builds
- `VOLUNTEER_EXPERIENCE`: Community leadership and involvement
- `CREATIVE_PROJECTS`: Artistic pursuits and design work
- `EDUCATION`: Academic background and degrees

### Features

- Section-based organization
- Coral accent dividers
- Responsive layout

---

## ExperienceCard

Reusable card component for displaying experience items.

### Props

```typescript
interface ExperienceCardProps {
  title: string;
  subtitle: string;
  description: string;
  questions: string[];
  imageUrl?: string;
  link?: string;
  links?: { name: string; url: string }[];
}
```

### Features

- Single external link support
- Multiple links with dropdown menu
- Suggested questions for AI chat
- Responsive design
- Hover animations

### Link Behavior

- Single `link`: Shows external link icon
- Multiple `links`: Shows dropdown with options
- Dropdown closes after selection

---

## Styling Architecture

### CSS Custom Properties

```css
--color-header-large: #2e2930;
--color-header-sub: #bfb0bf;
--color-accent: #d7907b;
--color-surface: #fefefe;
--color-text-primary: #2e2930;
--color-neutral: #f5f5f5;
```

### Responsive Strategy

- Mobile-first approach
- Single breakpoint at 768px
- Fixed height containers (90vh mobile, 70vh desktop)
- Social links show icons only on mobile
- Transform-based animations
- Touch-optimized interactions

### Chat Interface Layout

- Fixed height containers prevent overflow
- Chat messages area uses flex: 1 to fill available space
- Streaming responses with typewriter effect
- Question buttons parsed from AI responses
- Command history accessible via arrow keys

### Animation Principles

- CSS transforms for performance
- Smooth scroll behaviors
- Hover state transitions
- GPU-accelerated effects
- Streaming text animation
