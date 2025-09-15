/**
 * Type-safe wrapper for logger and monitoring to prevent TypeScript errors
 */

import { logger } from './logger.js';
import { monitoring } from './monitoring.js';

// Safe logger wrapper that handles parameter type issues - follows pino format (metadata, message)
export const safeLogger = {
  info: (message: string, meta?: any) => {
    try {
      if (meta && typeof meta === 'object') {
        logger.info(meta, message);
      } else {
        logger.info(message);
      }
    } catch (_error) {
      // Fallback silently - logging infrastructure failure shouldn't crash the app
      // In production, this would be sent to a fallback logging service
    }
  },

  error: (message: string, error?: any) => {
    try {
      if (error && typeof error === 'object') {
        logger.error(error, message);
      } else {
        logger.error(message);
      }
    } catch (_err) {
      // Fallback silently - logging infrastructure failure shouldn't crash the app
      // Critical errors should be sent to monitoring service or stderr in production
    }
  },

  warn: (message: string, meta?: any) => {
    try {
      if (meta && typeof meta === 'object') {
        logger.warn(meta, message);
      } else {
        logger.warn(message);
      }
    } catch (_error) {
      // Fallback silently - logging infrastructure failure shouldn't crash the app
    }
  },

  debug: (message: string, meta?: any) => {
    try {
      if (meta && typeof meta === 'object') {
        logger.debug(meta, message);
      } else {
        logger.debug(message);
      }
    } catch (_error) {
      // Fallback silently - debug logs can be safely ignored in fallback
    }
  }
};

// Safe monitoring wrapper
export const safeMonitoring = {
  recordApiCall: (service: string, endpoint: string, duration: number, statusCode = 200, success = true) => {
    try {
      if (monitoring && typeof monitoring.recordApiCall === 'function') {
        monitoring.recordApiCall(service, endpoint, duration, statusCode, success);
      }
    } catch (_error) {
      // Monitoring failures should not impact application flow
    }
  },

  recordMetric: (name: string, value: number, labels?: Record<string, string>) => {
    try {
      if (monitoring && typeof monitoring.recordMetric === 'function') {
        monitoring.recordMetric(name, value, labels);
      }
    } catch (_error) {
      // Metrics recording failure - continue without disruption
    }
  },

  recordError: (error: Error, context?: Record<string, any>) => {
    try {
      if (monitoring && typeof monitoring.recordError === 'function') {
        monitoring.recordError(error, context);
      }
    } catch (_err) {
      // Error recording failure - avoid recursive error logging
    }
  }
};