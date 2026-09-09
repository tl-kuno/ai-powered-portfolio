import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock fetch globally for all tests
globalThis.fetch = vi.fn();

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

// Setup cleanup after each test
beforeEach(() => {
  vi.clearAllMocks();
});
