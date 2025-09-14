/**
 * Test setup file for FastMCP server testing
 * Configures mocks, utilities, and test environment
 */

import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.EASYPOST_API_KEY = 'mock-easypost-key';
  process.env.VEEQO_API_KEY = 'mock-veeqo-key';

  // Set optional environment variables with defaults for testing
  process.env.PORT = '3001';
  process.env.HOST = 'localhost';
  process.env.EASYPOST_BASE_URL = 'https://api.easypost.com/v2';
  process.env.EASYPOST_TIMEOUT = '30000';
  process.env.VEEQO_BASE_URL = 'https://api.veeqo.com';
  process.env.VEEQO_TIMEOUT = '30000';
});

afterAll(() => {
  // Cleanup after all tests
  vi.clearAllMocks();
  vi.resetAllMocks();
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

// Mock external dependencies that shouldn't be called during tests
vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  }),
}));

// Mock network calls
vi.mock('undici', () => ({
  request: vi.fn(),
  fetch: vi.fn(),
}));

// Global test utilities
declare global {
  namespace Vi {
    interface AsserterMap {
      toBeValidMCPResponse: () => void;
      toBeValidToolResult: () => void;
    }
  }
}

// Custom matchers for FastMCP testing
expect.extend({
  toBeValidMCPResponse(received: unknown) {
    if (typeof received !== 'object' || received === null) {
      return {
        message: () => 'Expected valid MCP response object',
        pass: false,
      };
    }

    const response = received as Record<string, unknown>;

    if (!response.jsonrpc || response.jsonrpc !== '2.0') {
      return {
        message: () => 'Expected jsonrpc: "2.0"',
        pass: false,
      };
    }

    if (!response.id && response.id !== 0) {
      return {
        message: () => 'Expected id field',
        pass: false,
      };
    }

    if (!response.result && !response.error) {
      return {
        message: () => 'Expected either result or error field',
        pass: false,
      };
    }

    return {
      message: () => 'Valid MCP response',
      pass: true,
    };
  },

  toBeValidToolResult(received: unknown) {
    if (typeof received !== 'object' || received === null) {
      return {
        message: () => 'Expected valid tool result object',
        pass: false,
      };
    }

    const result = received as Record<string, unknown>;

    if (!result.content || !Array.isArray(result.content)) {
      return {
        message: () => 'Expected content array',
        pass: false,
      };
    }

    const hasValidContent = result.content.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const contentItem = item as Record<string, unknown>;
      return contentItem.type && contentItem.text;
    });

    if (!hasValidContent) {
      return {
        message: () => 'Expected valid content items with type and text',
        pass: false,
      };
    }

    return {
      message: () => 'Valid tool result',
      pass: true,
    };
  },
});

export {};
