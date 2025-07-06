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

### Key Features

- Scroll-based animations (scale/opacity)
- Collapsed header on scroll
- Chat message handling
- Social media links

---

## PortfolioSection

Portfolio content organized by experience categories.

### Props

None - contains all portfolio data internally

### Data Structure

- `softwareExperience`: Software development roles
- `healthcareExperience`: Healthcare background
- `personalProjects`: Side projects and builds
- `volunteerExperience`: Community involvement
- `creativeProjects`: Artistic pursuits
- `education`: Academic background

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
- Transform-based animations
- Touch-optimized interactions

### Animation Principles

- CSS transforms for performance
- Smooth scroll behaviors
- Hover state transitions
- GPU-accelerated effects
