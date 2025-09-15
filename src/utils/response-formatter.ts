import { monitoring } from './monitoring';
import { logger } from './logger';

/**
 * Formats API response with processing time
 */
export function formatApiResponse<T>(data: T, startTime: number): T & { processing_time_ms: number } {
  const duration = Date.now() - startTime;
  return {
    ...data,
    processing_time_ms: duration,
  };
}

/**
 * Handles API errors with consistent logging and monitoring
 */
export function handleApiError(
  error: any, 
  startTime: number, 
  service: string, 
  endpoint: string, 
  operation: string
): never {
  const duration = Date.now() - startTime;
  monitoring.recordApiCall(service, endpoint, duration, 500, true);
  logger.error({ error, operation }, `Failed to ${operation}`);
  throw error;
}

/**
 * Creates a standardized API response handler
 */
export function createApiHandler<T>(
  service: string,
  endpoint: string,
  operation: string
) {
  return {
    success: (data: T, startTime: number) => {
      const result = formatApiResponse(data, startTime);
      return JSON.stringify(result, null, 2);
    },
    error: (error: any, startTime: number) => {
      handleApiError(error, startTime, service, endpoint, operation);
    }
  };
}