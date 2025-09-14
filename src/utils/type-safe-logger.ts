/**
 * Type-safe wrapper for logger and monitoring to prevent TypeScript errors
 */

import { logger } from './logger.js';
import { monitoring } from './monitoring.js';

// Safe logger wrapper that handles parameter type issues
export const safeLogger = {
  info: (message: string, meta?: any) => {
    try {
      if (meta && typeof meta === 'object') {
        logger.info(message, meta);
      } else {
        logger.info(message);
      }
    } catch (_error) {
      console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },

  error: (message: string, error?: any) => {
    try {
      if (error) {
        logger.error(message, error);
      } else {
        logger.error(message);
      }
    } catch (_err) {
      console.error(`[ERROR] ${message}`, error ? error.toString() : '');
    }
  },

  warn: (message: string, meta?: any) => {
    try {
      if (meta && typeof meta === 'object') {
        logger.warn(message, meta);
      } else {
        logger.warn(message);
      }
    } catch (_error) {
      console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },

  debug: (message: string, meta?: any) => {
    try {
      if (meta && typeof meta === 'object') {
        logger.debug(message, meta);
      } else {
        logger.debug(message);
      }
    } catch (_error) {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

// Safe monitoring wrapper
export const safeMonitoring = {
  recordApiCall: (service: string, endpoint: string, duration: number, statusCode = 200, isError = false) => {
    try {
      if (monitoring && typeof monitoring.recordApiCall === 'function') {
        monitoring.recordApiCall(service, endpoint, duration, statusCode, isError);
      }
    } catch (_error) {
      console.log(`[MONITORING] API Call: ${service}${endpoint} - ${duration}ms - ${statusCode}`);
    }
  },

  recordMetric: (name: string, value: number, labels?: Record<string, string>) => {
    try {
      if (monitoring && typeof monitoring.recordMetric === 'function') {
        monitoring.recordMetric(name, value, labels);
      }
    } catch (_error) {
      console.log(`[MONITORING] Metric: ${name} = ${value}`, labels ? JSON.stringify(labels) : '');
    }
  },

  recordError: (error: Error, context?: Record<string, any>) => {
    try {
      if (monitoring && typeof monitoring.recordError === 'function') {
        monitoring.recordError(error, context);
      }
    } catch (_err) {
      console.error(`[MONITORING] Error: ${error.message}`, context ? JSON.stringify(context) : '');
    }
  }
};