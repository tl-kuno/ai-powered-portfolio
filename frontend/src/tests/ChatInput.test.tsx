import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatSection from '../components/ChatSection';

describe('Chat Input Functionality', () => {
  const mockSetShowPortfolio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for API calls
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ response: 'Test API response' }),
      });
    });
  });

  test('users can type in the chat input field', () => {
    render(
      <ChatSection
        showPortfolio={false}
        setShowPortfolio={mockSetShowPortfolio}
      />
    );

    const input = screen.getByPlaceholderText(/Ask about my experience/);

    // Should be able to type in the input
    fireEvent.change(input, { target: { value: 'Hello world' } });

    expect(input).toHaveValue('Hello world');
  });

  test('input value updates correctly', () => {
    render(
      <ChatSection
        showPortfolio={false}
        setShowPortfolio={mockSetShowPortfolio}
      />
    );

    const input = screen.getByPlaceholderText(/Ask about my experience/);

    // Test multiple value changes
    fireEvent.change(input, { target: { value: 'First message' } });
    expect(input).toHaveValue('First message');

    fireEvent.change(input, { target: { value: 'Updated message' } });
    expect(input).toHaveValue('Updated message');

    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue('');
  });

  test('input clears after sending message', async () => {
    render(
      <ChatSection
        showPortfolio={false}
        setShowPortfolio={mockSetShowPortfolio}
      />
    );

    const input = screen.getByPlaceholderText(/Ask about my experience/);
    const sendButton = screen.getByRole('button');

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(input).toHaveValue('Test message');

    // Send the message
    fireEvent.click(sendButton);

    // Input should be cleared after sending
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
});
