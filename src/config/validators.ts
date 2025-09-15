import { z } from 'zod';

/**
 * Creates a reusable API key validator that allows mock/test values
 */
export const createApiKeyValidator = (keyName: string) => 
  z.string().refine((val) => {
    // Allow empty/mock keys in test environment or when explicitly in mock mode
    if (process.env.NODE_ENV === 'test' || val === 'mock') {
      return true;
    }
    return val.length > 0;
  }, `${keyName} is required`);

/**
 * Common validation patterns for configuration
 */
export const configValidators = {
  apiKey: createApiKeyValidator,
  url: z.string().url(),
  timeout: z.number().default(30000),
  boolean: z.boolean().default(false),
} as const;