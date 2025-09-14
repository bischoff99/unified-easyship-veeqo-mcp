/**
 * Configuration Management
 *
 * Centralized configuration for the Unified EasyPost-Veeqo MCP Server
 */

import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load environment variables
loadDotenv({ path: resolve(process.cwd(), '.env') });

// Configuration schemas
const ServerConfigSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const EasyPostConfigSchema = z.object({
  apiKey: z.string().min(1, 'EASYPOST_API_KEY is required'),
  baseUrl: z.string().url().default('https://api.easypost.com/v2'),
  timeout: z.number().default(30000),
  mockMode: z.boolean().default(false),
});

const VeeqoConfigSchema = z.object({
  apiKey: z.string().min(1, 'VEEQO_API_KEY is required'),
  baseUrl: z.string().url().default('https://api.veeqo.com'),
  timeout: z.number().default(30000),
  mockMode: z.boolean().default(false),
});

const AIConfigSchema = z.object({
  claudeCodeApiKey: z.string().optional(),
  huggingFaceToken: z.string().optional(),
  claudeModel: z.string().default('claude-3-5-sonnet-20241022'),
  enableAI: z.boolean().default(false),
  claudeCodeEndpoint: z.string().default('https://api.claude.ai'),
});

const DatabaseConfigSchema = z.object({
  url: z.string().optional(),
  type: z.enum(['sqlite', 'postgresql', 'mysql']).default('sqlite'),
  logging: z.boolean().default(false),
});

const RedisConfigSchema = z.object({
  url: z.string().optional(),
  host: z.string().default('localhost'),
  port: z.number().default(6379),
  password: z.string().optional(),
  db: z.number().default(0),
});

const SecurityConfigSchema = z.object({
  jwtSecret: z.string().optional(),
  sessionSecret: z.string().optional(),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  rateLimitWindow: z.number().default(15 * 60 * 1000), // 15 minutes
  rateLimitMax: z.number().default(100),
});

// Main configuration schema
const ConfigSchema = z.object({
  server: ServerConfigSchema,
  easypost: EasyPostConfigSchema,
  veeqo: VeeqoConfigSchema,
  ai: AIConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  security: SecurityConfigSchema,
});

// Configuration types
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type EasyPostConfig = z.infer<typeof EasyPostConfigSchema>;
export type VeeqoConfig = z.infer<typeof VeeqoConfigSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Configuration factory
export function createConfig(): Config {
  const rawConfig = {
    server: {
      port: parseInt(process.env.PORT ?? '3000', 10),
      host: process.env.HOST ?? 'localhost',
      nodeEnv: process.env.NODE_ENV ?? 'development',
      logLevel: process.env.LOG_LEVEL ?? 'info',
    },
    easypost: {
      apiKey: process.env.EASYPOST_API_KEY ?? '',
      baseUrl: process.env.EASYPOST_BASE_URL ?? 'https://api.easypost.com/v2',
      timeout: parseInt(process.env.EASYPOST_TIMEOUT ?? '30000', 10),
      mockMode: process.env.EASYPOST_API_KEY === 'mock',
    },
    veeqo: {
      apiKey: process.env.VEEQO_API_KEY ?? '',
      baseUrl: process.env.VEEQO_BASE_URL ?? 'https://api.veeqo.com',
      timeout: parseInt(process.env.VEEQO_TIMEOUT ?? '30000', 10),
      mockMode: process.env.VEEQO_API_KEY === 'mock',
    },
    ai: {
      claudeCodeApiKey: process.env.CLAUDE_CODE_API_KEY,
      huggingFaceToken: process.env.HUGGING_FACE_HUB_TOKEN,
      claudeModel: process.env.CLAUDE_MODEL ?? 'claude-3-5-sonnet-20241022',
      enableAI: Boolean(process.env.CLAUDE_CODE_API_KEY),
      claudeCodeEndpoint: process.env.CLAUDE_CODE_ENDPOINT ?? 'https://api.claude.ai',
    },
    database: {
      url: process.env.DATABASE_URL,
      type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgresql' | 'mysql') ?? 'sqlite',
      logging: process.env.DATABASE_LOGGING === 'true',
    },
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB ?? '0', 10),
    },
    security: {
      jwtSecret: process.env.JWT_SECRET,
      sessionSecret: process.env.SESSION_SECRET,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW ?? '900000', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    },
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

// Export singleton configuration
export const config = createConfig();

// Environment validation
export function validateEnvironment(): void {
  const required = ['EASYPOST_API_KEY', 'VEEQO_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && !config.easypost.mockMode && !config.veeqo.mockMode) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Configuration helpers
export function isDevelopment(): boolean {
  return config.server.nodeEnv === 'development';
}

export function isProduction(): boolean {
  return config.server.nodeEnv === 'production';
}

export function isTest(): boolean {
  return config.server.nodeEnv === 'test';
}

export function isMockMode(): boolean {
  return config.easypost.mockMode || config.veeqo.mockMode;
}

export function getLogLevel(): string {
  return config.server.logLevel;
}

export function getPort(): number {
  return config.server.port;
}

export function getHost(): string {
  return config.server.host;
}
