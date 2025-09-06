import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: ['apiKey', 'authorization', 'EASYPOST_API_KEY', 'VEEQO_API_KEY'],
});

// Helper functions for structured logging
export const logInfo = (message: string, data?: Record<string, unknown>) => {
  if (data) {
    logger.info(data, message);
  } else {
    logger.info(message);
  }
};

export const logError = (message: string, data?: Record<string, unknown>) => {
  if (data) {
    logger.error(data, message);
  } else {
    logger.error(message);
  }
};

// Type-safe logger interface for consistent usage
export interface Logger {
  debug: (obj?: Record<string, unknown>, msg?: string, ...args: unknown[]) => void;
  info: (obj?: Record<string, unknown>, msg?: string, ...args: unknown[]) => void;
  warn: (obj?: Record<string, unknown>, msg?: string, ...args: unknown[]) => void;
  error: (obj?: Record<string, unknown>, msg?: string, ...args: unknown[]) => void;
}

// Logger is already exported above
