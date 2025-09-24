import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for API calls
    globalThis.fetch = vi.fn().mockImplementation(url => {
      if (typeof url === 'string' && url.includes('/api/chat')) {
        return Promise.resolve({
          json: () => Promise.resolve({ response: 'Test API response' }),
        });
      }
      // Let other requests pass through
      return Promise.resolve({
        json: () => Promise.resolve({}),
      });
    });
  });

  test('App component renders without crashing', () => {
    // Should render without throwing any errors
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(container.firstChild).toBeInTheDocument();
  });

  test('App component has basic navigation elements present', async () => {
    render(<App />);

    // Should have the scroll hint for navigation to portfolio
    await waitFor(() => {
      expect(
        screen.getByText(/Click to explore my portfolio/)
      ).toBeInTheDocument();
    });
  });

  test('App starts in chat view (initial state)', async () => {
    render(<App />);

    // Should start in chat view - check for chat elements
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Ask about my experience/)
      ).toBeInTheDocument();
    });

    // Should have the welcome message
    expect(screen.getByText(/Hey this is Taylor!/)).toBeInTheDocument();

    // Should have chat input and send button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
