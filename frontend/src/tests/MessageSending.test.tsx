import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatSection from '../components/ChatSection';

describe('Message Sending', () => {
  const mockSetShowPortfolio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for API calls - return fresh promises each time
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ response: 'Test API response' }),
      });
    });
  });

  test('clicking send button adds message to chat', async () => {
    render(
      <ChatSection
        showPortfolio={false}
        setShowPortfolio={mockSetShowPortfolio}
      />
    );

    const input = screen.getByPlaceholderText(/Ask about my experience/);
    const sendButton = screen.getByRole('button');

    // Type a message
    fireEvent.change(input, { target: { value: 'Hello from test' } });

    // Click send button
    fireEvent.click(sendButton);

    // Message should appear in chat
    await waitFor(() => {
      expect(screen.getByText('Hello from test')).toBeInTheDocument();
    });
  });

  test('message appears in chat history', async () => {
    render(
      <ChatSection
        showPortfolio={false}
        setShowPortfolio={mockSetShowPortfolio}
      />
    );

    const input = screen.getByPlaceholderText(/Ask about my experience/);
    const sendButton = screen.getByRole('button');

    // Send first message
    fireEvent.change(input, { target: { value: 'First message' } });
    fireEvent.click(sendButton);

    // Wait for first message to appear
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
    });

    // Wait for first AI response to appear and streaming to complete
    await waitFor(() => {
      expect(screen.getByText('Test API response')).toBeInTheDocument();
    });

    // Wait for streaming animation to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Type second message
    fireEvent.change(input, { target: { value: 'Second message' } });

    // Wait for button to be enabled (streaming should be done)
    await waitFor(() => {
      expect(sendButton).toBeEnabled();
    });

    // Send second message
    fireEvent.click(sendButton);

    // Wait for second message to appear
    await waitFor(() => {
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    // Wait for second AI response to appear and streaming to complete
    await waitFor(() => {
      expect(screen.getAllByText('Test API response')).toHaveLength(2);
    });

    // Check both messages are in chat history
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  test('empty messages are not sent', () => {
    render(
      <ChatSection
        showPortfolio={false}
        setShowPortfolio={mockSetShowPortfolio}
      />
    );

    const input = screen.getByPlaceholderText(/Ask about my experience/);
    const sendButton = screen.getByRole('button');

    // Send button should be disabled when input is empty
    expect(sendButton).toBeDisabled();

    // Try to send empty message
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(sendButton);

    // Should still only have the welcome message
    expect(screen.getByText(/Hey this is Taylor!/)).toBeInTheDocument();

    // Send button should remain disabled for empty input
    expect(sendButton).toBeDisabled();

    // Try with whitespace only
    fireEvent.change(input, { target: { value: '   ' } });

    // Should still be disabled for whitespace-only input
    expect(sendButton).toBeDisabled();

    // Should enable when there's actual content
    fireEvent.change(input, { target: { value: 'Real message' } });
    expect(sendButton).toBeEnabled();
  });
});
