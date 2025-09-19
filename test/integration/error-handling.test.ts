/**
 * Error Handling Integration Tests
 */

import { describe, test, expect, beforeEach, beforeAll } from "vitest";
import {
  ErrorCode,
  McpError,
  CircuitBreaker,
  ErrorCollector,
  withRetry,
  handleApiError,
  createError,
  isRetryableError,
  shouldRetryAfter,
  isMcpError,
  createValidationError,
  getErrorResponse,
  DEFAULT_RETRY_OPTIONS,
} from "../../src/utils/errors.js";

describe("Error Handling Integration", () => {
  let errorCollector: ErrorCollector;
  let circuitBreaker: CircuitBreaker;

  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = "test";
  });

  beforeEach(() => {
    errorCollector = new ErrorCollector();
    circuitBreaker = new CircuitBreaker(3, 5000, 1000); // threshold=3, timeout=5s, reset=1s
  });

  test("should create MCP errors correctly", () => {
    const error = createError(
      ErrorCode.API_ERROR,
      "Test API error",
      { service: "test" },
      500,
    );

    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(ErrorCode.API_ERROR);
    expect(error.message).toBe("Test API error");
    expect(error.details).toEqual({ service: "test" });
    expect(error.statusCode).toBe(500);
  });

  test("should determine default status codes correctly", () => {
    const badRequestError = createError(
      ErrorCode.INVALID_PARAMS,
      "Bad request",
    );
    const unauthorizedError = createError(
      ErrorCode.UNAUTHORIZED,
      "Unauthorized",
    );
    const notFoundError = createError(ErrorCode.NOT_FOUND, "Not found");
    const rateLimitError = createError(ErrorCode.RATE_LIMITED, "Rate limited");
    const internalError = createError(
      ErrorCode.INTERNAL_ERROR,
      "Internal error",
    );

    expect(badRequestError.statusCode).toBe(400);
    expect(unauthorizedError.statusCode).toBe(401);
    expect(notFoundError.statusCode).toBe(404);
    expect(rateLimitError.statusCode).toBe(429);
    expect(internalError.statusCode).toBe(500);
  });

  test("should identify retryable errors", () => {
    const retryableErrors = [
      createError(ErrorCode.TIMEOUT, "Timeout"),
      createError(ErrorCode.SERVICE_UNAVAILABLE, "Service unavailable"),
      createError(ErrorCode.RATE_LIMITED, "Rate limited"),
      createError(ErrorCode.NETWORK_ERROR, "Network error"),
    ];

    const nonRetryableErrors = [
      createError(ErrorCode.INVALID_PARAMS, "Invalid params"),
      createError(ErrorCode.NOT_FOUND, "Not found"),
      createError(ErrorCode.UNAUTHORIZED, "Unauthorized"),
    ];

    retryableErrors.forEach((error) => {
      expect(isRetryableError(error)).toBe(true);
    });

    nonRetryableErrors.forEach((error) => {
      expect(isRetryableError(error)).toBe(false);
    });
  });

  test("should calculate retry delays correctly", () => {
    const rateLimitError = createError(ErrorCode.RATE_LIMITED, "Rate limited", {
      retryAfter: 30,
    });
    const serviceError = createError(
      ErrorCode.SERVICE_UNAVAILABLE,
      "Service unavailable",
    );
    const otherError = createError(ErrorCode.TIMEOUT, "Timeout");

    expect(shouldRetryAfter(rateLimitError)).toBe(30);
    expect(shouldRetryAfter(serviceError)).toBe(30);
    expect(shouldRetryAfter(otherError)).toBeNull();
  });

  test("should identify MCP errors", () => {
    const mcpError = createError(ErrorCode.API_ERROR, "API error");
    const regularError = new Error("Regular error");

    expect(isMcpError(mcpError)).toBe(true);
    expect(isMcpError(regularError)).toBe(false);
    expect(isMcpError(null)).toBe(false);
    expect(isMcpError(undefined)).toBe(false);
    expect(isMcpError("string")).toBe(false);
  });

  test("should create validation errors", () => {
    const validationError = createValidationError(
      "email",
      "invalid",
      "valid email",
    );

    expect(validationError).toBeInstanceOf(McpError);
    expect(validationError.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(validationError.message).toContain("email");
    expect(validationError.message).toContain("valid email");
    expect(validationError.details).toEqual({
      field: "email",
      value: "invalid",
      expected: "valid email",
    });
  });

  test("should convert errors to response format", () => {
    const mcpError = createError(ErrorCode.API_ERROR, "API error", {
      service: "test",
    });
    const regularError = new Error("Regular error");

    const mcpResponse = getErrorResponse(mcpError);
    const regularResponse = getErrorResponse(regularError);

    expect(mcpResponse.error.code).toBe(ErrorCode.API_ERROR);
    expect(mcpResponse.error.message).toBe("API error");
    expect(mcpResponse.error.details).toEqual({ service: "test" });

    expect(regularResponse.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(regularResponse.error.message).toBe("Regular error");
  });

  test("should handle API errors correctly", () => {
    const httpError = {
      response: {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Invalid API key" },
        headers: {},
      },
    };

    const networkError = {
      code: "ENOTFOUND",
      message: "getaddrinfo ENOTFOUND api.example.com",
    };

    const timeoutError = {
      code: "ETIMEDOUT",
      message: "Request timeout",
    };

    const easypostError = handleApiError(httpError, "easypost");
    const veeqoNetworkError = handleApiError(networkError, "veeqo");
    const timeoutMcpError = handleApiError(timeoutError, "easypost");

    expect(easypostError.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(easypostError.message).toContain("easypost");
    expect(easypostError.message).toContain("Unauthorized");
    expect(easypostError.statusCode).toBe(401);

    expect(veeqoNetworkError.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(veeqoNetworkError.message).toContain("veeqo");

    expect(timeoutMcpError.code).toBe(ErrorCode.TIMEOUT);
    expect(timeoutMcpError.message).toContain("easypost");
  });

  describe("Circuit Breaker", () => {
    test("should start in CLOSED state", () => {
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe("CLOSED");
      expect(status.failures).toBe(0);
    });

    test("should execute successful operations", async () => {
      const result = await circuitBreaker.execute(async () => "success");
      expect(result).toBe("success");

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe("CLOSED");
      expect(status.failures).toBe(0);
    });

    test("should count failures and open when threshold reached", async () => {
      // Cause failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error("Test failure");
          });
        } catch (error) {
          // Expected
        }
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe("OPEN");
      expect(status.failures).toBe(3);

      // Next execution should be rejected immediately
      await expect(
        circuitBreaker.execute(async () => "success"),
      ).rejects.toThrow("Circuit breaker is OPEN");
    });

    test("should transition to HALF_OPEN after reset timeout", async () => {
      // Force circuit breaker to OPEN state
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error("Test failure");
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for reset timeout (1 second in test config)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should transition to HALF_OPEN and allow execution
      const result = await circuitBreaker.execute(async () => "recovered");
      expect(result).toBe("recovered");

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe("CLOSED"); // Should be CLOSED after successful execution
      expect(status.failures).toBe(0);
    });
  });

  describe("Error Collector", () => {
    test("should collect errors", () => {
      const error1 = createError(ErrorCode.API_ERROR, "First error");
      const error2 = createError(ErrorCode.TIMEOUT, "Second error");

      errorCollector.add(error1);
      errorCollector.add(error2);

      const summary = errorCollector.getSummary();
      expect(summary.total).toBe(2);
      expect(summary.byCode[ErrorCode.API_ERROR]).toBe(1);
      expect(summary.byCode[ErrorCode.TIMEOUT]).toBe(1);
    });

    test("should limit error collection", () => {
      const limitedCollector = new ErrorCollector(5);

      // Add more errors than the limit
      for (let i = 0; i < 10; i++) {
        const error = createError(ErrorCode.API_ERROR, `Error ${i}`);
        limitedCollector.add(error);
      }

      const summary = limitedCollector.getSummary();
      expect(summary.total).toBe(5); // Should be limited to 5
    });

    test("should filter errors by code", () => {
      const apiError = createError(ErrorCode.API_ERROR, "API error");
      const timeoutError = createError(ErrorCode.TIMEOUT, "Timeout error");

      errorCollector.add(apiError);
      errorCollector.add(timeoutError);

      const apiErrors = errorCollector.getErrorsByCode(ErrorCode.API_ERROR);
      const timeoutErrors = errorCollector.getErrorsByCode(ErrorCode.TIMEOUT);

      expect(apiErrors).toHaveLength(1);
      expect(timeoutErrors).toHaveLength(1);
      expect(apiErrors[0]).toBe(apiError);
      expect(timeoutErrors[0]).toBe(timeoutError);
    });

    test("should clear errors", () => {
      const error = createError(ErrorCode.API_ERROR, "Test error");
      errorCollector.add(error);

      expect(errorCollector.getSummary().total).toBe(1);

      errorCollector.clear();

      expect(errorCollector.getSummary().total).toBe(0);
    });
  });

  describe("Retry Logic", () => {
    test("should retry failed operations", async () => {
      let attempts = 0;

      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw createError(ErrorCode.TIMEOUT, "Timeout error");
          }
          return "success";
        },
        {
          maxAttempts: 3,
          baseDelay: 10, // Short delay for tests
          maxDelay: 100,
          exponentialBackoff: false,
          jitter: false,
        },
      );

      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    test("should not retry non-retryable errors", async () => {
      let attempts = 0;

      await expect(
        withRetry(async () => {
          attempts++;
          throw createError(ErrorCode.INVALID_PARAMS, "Invalid params");
        }),
      ).rejects.toThrow("Invalid params");

      expect(attempts).toBe(1); // Should not retry
    });

    test("should respect max attempts", async () => {
      let attempts = 0;

      await expect(
        withRetry(
          async () => {
            attempts++;
            throw createError(ErrorCode.TIMEOUT, "Timeout error");
          },
          {
            maxAttempts: 2,
            baseDelay: 10,
            maxDelay: 100,
            exponentialBackoff: false,
            jitter: false,
          },
        ),
      ).rejects.toThrow("Timeout error");

      expect(attempts).toBe(2);
    });

    test("should use default retry options", async () => {
      let attempts = 0;

      await expect(
        withRetry(async () => {
          attempts++;
          throw createError(ErrorCode.TIMEOUT, "Timeout error");
        }),
      ).rejects.toThrow("Timeout error");

      expect(attempts).toBe(DEFAULT_RETRY_OPTIONS.maxAttempts);
    });
  });

  test("should serialize errors to JSON", () => {
    const error = createError(
      ErrorCode.API_ERROR,
      "Test error",
      { service: "test", endpoint: "/api/test" },
      500,
    );

    const json = error.toJSON();

    expect(json).toEqual({
      code: ErrorCode.API_ERROR,
      message: "Test error",
      details: { service: "test", endpoint: "/api/test" },
      statusCode: 500,
    });
  });
});
