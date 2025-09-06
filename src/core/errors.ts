/**
 * Error Handling System
 * Centralized error definitions and utilities
 */

export enum ErrorCode {
  // Client errors (4xx)
  INVALID_PARAMS = 'INVALID_PARAMS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // API specific errors
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Business logic errors
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  SHIPPING_ERROR = 'SHIPPING_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

export class McpError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;
  public readonly statusCode: number;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode || this.getDefaultStatusCode(code);
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.INVALID_PARAMS:
      case ErrorCode.VALIDATION_ERROR:
        return 400;
      case ErrorCode.UNAUTHORIZED:
        return 401;
      case ErrorCode.FORBIDDEN:
        return 403;
      case ErrorCode.NOT_FOUND:
        return 404;
      case ErrorCode.RATE_LIMITED:
        return 429;
      case ErrorCode.INTERNAL_ERROR:
      case ErrorCode.API_ERROR:
        return 500;
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 503;
      case ErrorCode.TIMEOUT:
        return 504;
      default:
        return 500;
    }
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  statusCode?: number
): McpError {
  return new McpError(code, message, details, statusCode);
}

export function isRetryableError(error: McpError): boolean {
  return [
    ErrorCode.TIMEOUT,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.RATE_LIMITED,
    ErrorCode.NETWORK_ERROR,
  ].includes(error.code);
}

export function shouldRetryAfter(error: McpError): number | null {
  if (error.code === ErrorCode.RATE_LIMITED) {
    return error.details?.retryAfter || 60; // Default 60 seconds
  }
  if (error.code === ErrorCode.SERVICE_UNAVAILABLE) {
    return 30; // Default 30 seconds
  }
  return null;
}
