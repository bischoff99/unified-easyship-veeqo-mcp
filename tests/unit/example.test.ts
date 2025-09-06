/**
 * Example Unit Test
 * Template for unit testing with Vitest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EasyPostClient } from '../../src/services/clients/easypost-enhanced.js';
import { createError, ErrorCode } from '../../src/core/errors.js';

describe('EasyPostClient', () => {
  let client: EasyPostClient;

  beforeEach(() => {
    // Use mock API key for testing
    process.env.EASYPOST_API_KEY = 'mock';
    client = new EasyPostClient();
  });

  describe('constructor', () => {
    it('should initialize with mock API key', () => {
      expect(client).toBeDefined();
    });

    it('should throw error without API key', () => {
      delete process.env.EASYPOST_API_KEY;
      expect(() => new EasyPostClient()).toThrow();
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', () => {
      const error = createError(ErrorCode.INVALID_PARAMS, 'Test error');
      expect(error.code).toBe(ErrorCode.INVALID_PARAMS);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
    });
  });
});
