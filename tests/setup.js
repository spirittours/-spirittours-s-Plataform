// Jest Setup File
// This file is executed before running tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_URL = 'http://localhost:8000';
process.env.REACT_APP_ENV = 'test';

// Check if we're in a browser-like environment (frontend tests)
const isBrowserEnvironment = typeof window !== 'undefined';

if (isBrowserEnvironment) {
  // Mock window.matchMedia (for frontend tests)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver (for frontend tests)
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  };

  // Mock localStorage (for frontend tests)
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  global.localStorage = localStorageMock;
}

// Mock fetch (for both frontend and backend tests)
global.fetch = jest.fn();

// Setup console mocks to avoid noise in test output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};