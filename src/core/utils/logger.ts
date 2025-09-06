import pino from 'pino';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    redact: ['apiKey', 'authorization', 'EASYPOST_API_KEY', 'VEEQO_API_KEY'],
  },
  pino.destination(2), // stderr only
);

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
