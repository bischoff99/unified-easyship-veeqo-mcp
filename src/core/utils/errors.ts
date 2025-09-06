/**
 * Error handling utilities for the MCP server
 */

export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_PARAMS = 'INVALID_PARAMS',
  METHOD_NOT_FOUND = 'METHOD_NOT_FOUND',
  EXTERNAL_ERROR = 'EXTERNAL_ERROR',

  // API errors
  API_ERROR = 'API_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMITED = 'API_RATE_LIMITED',

  // EasyPost errors
  EASYPOST_ERROR = 'EASYPOST_ERROR',
  EASYPOST_INVALID_ADDRESS = 'EASYPOST_INVALID_ADDRESS',
  EASYPOST_INSUFFICIENT_FUNDS = 'EASYPOST_INSUFFICIENT_FUNDS',

  // Veeqo errors
  VEEQO_ERROR = 'VEEQO_ERROR',
  VEEQO_INVENTORY_ERROR = 'VEEQO_INVENTORY_ERROR',
  VEEQO_ORDER_ERROR = 'VEEQO_ORDER_ERROR',
}

export interface McpError extends Error {
  code: ErrorCode;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export function createError(
  code: ErrorCode,
  message: string,
  statusCode?: number,
  details?: Record<string, unknown>,
): McpError {
  const error = new Error(message) as McpError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

export function isMcpError(error: unknown): error is McpError {
  return error instanceof Error && 'code' in error;
}

export function getErrorResponse(error: unknown): {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
} {
  if (isMcpError(error)) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  };
}
