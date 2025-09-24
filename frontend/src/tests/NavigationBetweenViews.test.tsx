import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Navigation Between Views', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  test('app starts in chat view by default', () => {
    render(<App />);

    // Check that chat interface is visible
    expect(
      screen.getByPlaceholderText(/Ask about my experience/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hey this is Taylor! Welcome to my site/)
    ).toBeInTheDocument();

    // Check that portfolio scroll hint is visible (indicates chat view)
    expect(
      screen.getByText(/Click to explore my portfolio/)
    ).toBeInTheDocument();

    // Portfolio content should not be visible initially
    expect(screen.queryByText(/Software Experience/)).not.toBeInTheDocument();
  });

  test('switching from chat to portfolio view works', () => {
    render(<App />);

    // Initially in chat view
    expect(
      screen.getByText(/Click to explore my portfolio/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Software Experience/)).not.toBeInTheDocument();

    // Click the portfolio navigation link
    const portfolioLink = screen.getByText(/Click to explore my portfolio/);
    fireEvent.click(portfolioLink);

    // Should now show portfolio content
    expect(screen.getByText(/Software Experience/)).toBeInTheDocument();
    expect(
      screen.getByText(/Software Developer - MobileTouch Team/)
    ).toBeInTheDocument();

    // Chat interface should be collapsed/hidden but not completely gone
    expect(
      screen.getByPlaceholderText(/Ask about my experience/)
    ).toBeInTheDocument();
  });

  test('navigation back to chat from portfolio works', () => {
    render(<App />);

    // Navigate to portfolio first
    const portfolioLink = screen.getByText(/Click to explore my portfolio/);
    fireEvent.click(portfolioLink);

    // Verify we're in portfolio view
    expect(screen.getByText(/Software Experience/)).toBeInTheDocument();

    // Find the back to chat button by class name since it has no accessible name
    const backToChatButton = document.querySelector(
      '.scroll-to-top'
    ) as HTMLElement;
    expect(backToChatButton).toBeInTheDocument();
    fireEvent.click(backToChatButton);

    // Should be back in chat view - portfolio link should be visible again
    expect(
      screen.getByText(/Click to explore my portfolio/)
    ).toBeInTheDocument();

    // Chat input should be fully functional again
    const chatInput = screen.getByPlaceholderText(/Ask about my experience/);
    expect(chatInput).toBeVisible();
    fireEvent.change(chatInput, { target: { value: 'Test message' } });
    expect(chatInput).toHaveValue('Test message');
  });

  test('view states change correctly during navigation', () => {
    render(<App />);

    // Initial state: chat view
    const chatSection = document.querySelector('.chat-section');
    expect(chatSection).not.toHaveClass('collapsed');

    const chatInterface = screen
      .getByPlaceholderText(/Ask about my experience/)
      .closest('.chat-interface');
    expect(chatInterface).not.toHaveClass('hidden');

    // Navigate to portfolio
    const portfolioLink = screen.getByText(/Click to explore my portfolio/);
    fireEvent.click(portfolioLink);

    // Chat section should now have collapsed class
    expect(chatSection).toHaveClass('collapsed');

    // Portfolio section should be visible
    expect(screen.getByText(/Software Experience/)).toBeInTheDocument();

    // Navigate back to chat
    const backToChatButton = document.querySelector(
      '.scroll-to-top'
    ) as HTMLElement;
    fireEvent.click(backToChatButton);

    // Chat section should no longer be collapsed
    expect(chatSection).not.toHaveClass('collapsed');
  });

  test('chat functionality remains intact after view navigation', () => {
    render(<App />);

    // Navigate to portfolio and back
    const portfolioLink = screen.getByText(/Click to explore my portfolio/);
    fireEvent.click(portfolioLink);

    const backToChatButton = document.querySelector(
      '.scroll-to-top'
    ) as HTMLElement;
    fireEvent.click(backToChatButton);

    // Test that chat still works
    const chatInput = screen.getByPlaceholderText(/Ask about my experience/);
    const sendButton = screen.getByRole('button');

    // Should be able to type and interact with chat
    fireEvent.change(chatInput, { target: { value: 'Test after navigation' } });
    expect(chatInput).toHaveValue('Test after navigation');

    // Send button should be enabled with text
    expect(sendButton).toBeEnabled();
  });

  test('portfolio functionality remains intact after navigation', () => {
    render(<App />);

    // Navigate to portfolio, back to chat, then to portfolio again
    const portfolioLink = screen.getByText(/Click to explore my portfolio/);
    fireEvent.click(portfolioLink);

    const backToChatButton = document.querySelector(
      '.scroll-to-top'
    ) as HTMLElement;
    fireEvent.click(backToChatButton);

    // Navigate to portfolio again
    fireEvent.click(portfolioLink);

    // Portfolio should still be functional
    expect(screen.getByText(/Software Experience/)).toBeInTheDocument();
    expect(
      screen.getByText(/Software Developer - MobileTouch Team/)
    ).toBeInTheDocument();

    // Test navigation within portfolio
    const nextButton = screen.getByRole('button', { name: />/i });
    fireEvent.click(nextButton);

    expect(screen.getByText(/Healthcare Experience/)).toBeInTheDocument();
  });

  test('multiple rapid navigation transitions work correctly', () => {
    render(<App />);

    const portfolioLink = screen.getByText(/Click to explore my portfolio/);

    // Rapidly navigate back and forth
    fireEvent.click(portfolioLink);
    expect(screen.getByText(/Software Experience/)).toBeInTheDocument();

    const backToChatButton = document.querySelector(
      '.scroll-to-top'
    ) as HTMLElement;
    fireEvent.click(backToChatButton);
    expect(
      screen.getByText(/Click to explore my portfolio/)
    ).toBeInTheDocument();

    fireEvent.click(portfolioLink);
    expect(screen.getByText(/Software Experience/)).toBeInTheDocument();

    fireEvent.click(backToChatButton);
    expect(
      screen.getByText(/Click to explore my portfolio/)
    ).toBeInTheDocument();

    // Final state should be chat view
    expect(
      screen.getByPlaceholderText(/Ask about my experience/)
    ).toBeVisible();
  });

  test('collapsed header appears when in portfolio view', () => {
    render(<App />);

    // Initially no collapsed header
    expect(screen.queryByText(/TK/)).not.toBeInTheDocument();

    // Navigate to portfolio
    const portfolioLink = screen.getByText(/Click to explore my portfolio/);
    fireEvent.click(portfolioLink);

    // Collapsed header should appear
    expect(screen.getByText(/TK/)).toBeInTheDocument();

    // Should have social links in collapsed header
    const githubLinks = screen.getAllByText(/github/i);
    expect(githubLinks.length).toBeGreaterThan(0);

    // Navigate back - collapsed header should disappear
    const backToChatButton = document.querySelector(
      '.scroll-to-top'
    ) as HTMLElement;
    fireEvent.click(backToChatButton);

    // Collapsed header should be gone
    expect(screen.queryByText(/TK/)).not.toBeInTheDocument();
  });
});
