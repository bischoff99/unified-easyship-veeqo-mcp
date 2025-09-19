/**
 * Error Handling System
 * Centralized error definitions and utilities
 */

export enum ErrorCode {
  // Client errors (4xx)
  INVALID_PARAMS = "INVALID_PARAMS",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  METHOD_NOT_FOUND = "METHOD_NOT_FOUND",

  // Server errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",

  // API specific errors
  API_ERROR = "API_ERROR",
  API_TIMEOUT = "API_TIMEOUT",
  API_RATE_LIMITED = "API_RATE_LIMITED",
  NETWORK_ERROR = "NETWORK_ERROR",
  EXTERNAL_ERROR = "EXTERNAL_ERROR",

  // EasyPost errors
  EASYPOST_ERROR = "EASYPOST_ERROR",
  EASYPOST_INVALID_ADDRESS = "EASYPOST_INVALID_ADDRESS",
  EASYPOST_INSUFFICIENT_FUNDS = "EASYPOST_INSUFFICIENT_FUNDS",

  // Veeqo errors
  VEEQO_ERROR = "VEEQO_ERROR",
  VEEQO_INVENTORY_ERROR = "VEEQO_INVENTORY_ERROR",
  VEEQO_ORDER_ERROR = "VEEQO_ORDER_ERROR",

  // Business logic errors
  INSUFFICIENT_INVENTORY = "INSUFFICIENT_INVENTORY",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  SHIPPING_ERROR = "SHIPPING_ERROR",
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
    statusCode?: number,
  ) {
    super(message);
    this.name = "McpError";
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
  statusCode?: number,
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

export function isMcpError(error: unknown): error is McpError {
  return error instanceof Error && "code" in error;
}

// ============================================================================
// ADVANCED ERROR HANDLING UTILITIES
// ============================================================================

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBackoff: true,
  jitter: true,
};

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw createError(
          ErrorCode.SERVICE_UNAVAILABLE,
          "Circuit breaker is OPEN - service temporarily unavailable",
          {
            state: this.state,
            failures: this.failures,
            timeUntilReset:
              this.resetTimeout - (Date.now() - this.lastFailureTime),
          },
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.threshold,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      if (isMcpError(lastError) && !isRetryableError(lastError)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError!;
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  let delay = options.baseDelay;

  if (options.exponentialBackoff) {
    delay = Math.min(
      options.baseDelay * Math.pow(2, attempt - 1),
      options.maxDelay,
    );
  }

  if (options.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ErrorCollector {
  private errors: McpError[] = [];
  private readonly maxErrors: number;

  constructor(maxErrors: number = 100) {
    this.maxErrors = maxErrors;
  }

  add(error: McpError) {
    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  getRecentErrors(minutes: number = 10): McpError[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.errors.filter(
      (error) => error.details?.timestamp && error.details.timestamp > cutoff,
    );
  }

  getErrorsByCode(code: ErrorCode): McpError[] {
    return this.errors.filter((error) => error.code === code);
  }

  clear() {
    this.errors = [];
  }

  getSummary() {
    const byCode = this.errors.reduce(
      (acc, error) => {
        acc[error.code] = (acc[error.code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: this.errors.length,
      byCode,
      recent: this.getRecentErrors().length,
    };
  }
}

export function handleApiError(
  error: any,
  service: "easypost" | "veeqo",
): McpError {
  if (isMcpError(error)) {
    return error;
  }

  // Handle HTTP errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return createError(
          ErrorCode.INVALID_PARAMS,
          `${service} API: ${data?.message || "Bad request"}`,
          { service, status, data },
          400,
        );
      case 401:
        return createError(
          ErrorCode.UNAUTHORIZED,
          `${service} API: Unauthorized - check API key`,
          { service, status },
          401,
        );
      case 403:
        return createError(
          ErrorCode.FORBIDDEN,
          `${service} API: Forbidden - insufficient permissions`,
          { service, status },
          403,
        );
      case 404:
        return createError(
          ErrorCode.NOT_FOUND,
          `${service} API: Resource not found`,
          { service, status },
          404,
        );
      case 429:
        return createError(
          ErrorCode.RATE_LIMITED,
          `${service} API: Rate limit exceeded`,
          {
            service,
            status,
            retryAfter: error.response.headers["retry-after"] || 60,
          },
          429,
        );
      case 500:
      case 502:
      case 503:
        return createError(
          ErrorCode.SERVICE_UNAVAILABLE,
          `${service} API: Service temporarily unavailable`,
          { service, status },
          status,
        );
      case 504:
        return createError(
          ErrorCode.TIMEOUT,
          `${service} API: Request timeout`,
          { service, status },
          504,
        );
      default:
        return createError(
          ErrorCode.API_ERROR,
          `${service} API error: ${data?.message || "Unknown error"}`,
          { service, status, data },
          status,
        );
    }
  }

  // Handle network errors
  if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return createError(
      ErrorCode.NETWORK_ERROR,
      `Network error connecting to ${service}: ${error.message}`,
      { service, networkCode: error.code },
    );
  }

  // Handle timeout errors
  if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
    return createError(ErrorCode.TIMEOUT, `Request to ${service} timed out`, {
      service,
      originalMessage: error.message,
    });
  }

  // Default error
  return createError(
    ErrorCode.EXTERNAL_ERROR,
    `Unexpected ${service} error: ${error.message}`,
    { service, originalError: error.toString() },
  );
}

export function createValidationError(
  field: string,
  value: any,
  expected: string,
): McpError {
  return createError(
    ErrorCode.VALIDATION_ERROR,
    `Validation failed for field '${field}': expected ${expected}, got ${typeof value}`,
    { field, value, expected },
  );
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
      message: error instanceof Error ? error.message : "Unknown error",
    },
  };
}
