import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChatSection from './ChatSection';

describe('ChatSection', () => {
  it('renders profile header', () => {
    render(<ChatSection />);
    
    expect(screen.getByText('<TaylorKuno />')).toBeInTheDocument();
  });

  it('renders social links', () => {
    render(<ChatSection />);
    
    expect(screen.getByText('/github')).toBeInTheDocument();
    expect(screen.getByText('/linkedin')).toBeInTheDocument();
    expect(screen.getByText('@gmail')).toBeInTheDocument();
  });

  it('renders initial AI message', () => {
    render(<ChatSection />);
    
    expect(screen.getByText("Hi! I'm Taylor's AI assistant. Ask me anything about her background, experience, or projects!")).toBeInTheDocument();
  });

  it('renders chat input', () => {
    render(<ChatSection />);
    
    expect(screen.getByPlaceholderText('Ask about my experience, projects, or anything else...')).toBeInTheDocument();
  });
});