import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExperienceCard from './ExperienceCard';

describe('ExperienceCard', () => {
  const mockProps = {
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    description: 'Test description',
    questions: ['Question 1', 'Question 2'],
  };

  it('renders title and subtitle', () => {
    render(<ExperienceCard {...mockProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ExperienceCard {...mockProps} />);
    
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders suggested questions', () => {
    render(<ExperienceCard {...mockProps} />);
    
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Question 2')).toBeInTheDocument();
  });
});