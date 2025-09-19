/**
 * Error Handling System
 * Centralized error definitions and utilities
 */
export var ErrorCode;
(function (ErrorCode) {
    // Client errors (4xx)
    ErrorCode["INVALID_PARAMS"] = "INVALID_PARAMS";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["METHOD_NOT_FOUND"] = "METHOD_NOT_FOUND";
    // Server errors (5xx)
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    // API specific errors
    ErrorCode["API_ERROR"] = "API_ERROR";
    ErrorCode["API_TIMEOUT"] = "API_TIMEOUT";
    ErrorCode["API_RATE_LIMITED"] = "API_RATE_LIMITED";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["EXTERNAL_ERROR"] = "EXTERNAL_ERROR";
    // EasyPost errors
    ErrorCode["EASYPOST_ERROR"] = "EASYPOST_ERROR";
    ErrorCode["EASYPOST_INVALID_ADDRESS"] = "EASYPOST_INVALID_ADDRESS";
    ErrorCode["EASYPOST_INSUFFICIENT_FUNDS"] = "EASYPOST_INSUFFICIENT_FUNDS";
    // Veeqo errors
    ErrorCode["VEEQO_ERROR"] = "VEEQO_ERROR";
    ErrorCode["VEEQO_INVENTORY_ERROR"] = "VEEQO_INVENTORY_ERROR";
    ErrorCode["VEEQO_ORDER_ERROR"] = "VEEQO_ORDER_ERROR";
    // Business logic errors
    ErrorCode["INSUFFICIENT_INVENTORY"] = "INSUFFICIENT_INVENTORY";
    ErrorCode["INVALID_ADDRESS"] = "INVALID_ADDRESS";
    ErrorCode["SHIPPING_ERROR"] = "SHIPPING_ERROR";
})(ErrorCode || (ErrorCode = {}));
export class McpError extends Error {
    code;
    details;
    statusCode;
    constructor(code, message, details, statusCode) {
        super(message);
        this.name = "McpError";
        this.code = code;
        this.details = details;
        this.statusCode = statusCode || this.getDefaultStatusCode(code);
    }
    getDefaultStatusCode(code) {
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
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
            statusCode: this.statusCode,
        };
    }
}
export function createError(code, message, details, statusCode) {
    return new McpError(code, message, details, statusCode);
}
export function isRetryableError(error) {
    return [
        ErrorCode.TIMEOUT,
        ErrorCode.SERVICE_UNAVAILABLE,
        ErrorCode.RATE_LIMITED,
        ErrorCode.NETWORK_ERROR,
    ].includes(error.code);
}
export function shouldRetryAfter(error) {
    if (error.code === ErrorCode.RATE_LIMITED) {
        return error.details?.retryAfter || 60; // Default 60 seconds
    }
    if (error.code === ErrorCode.SERVICE_UNAVAILABLE) {
        return 30; // Default 30 seconds
    }
    return null;
}
export function isMcpError(error) {
    return error instanceof Error && "code" in error;
}
export const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBackoff: true,
    jitter: true,
};
export class CircuitBreaker {
    threshold;
    timeout;
    resetTimeout;
    failures = 0;
    lastFailureTime = 0;
    state = "CLOSED";
    constructor(threshold = 5, timeout = 60000, resetTimeout = 30000) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.resetTimeout = resetTimeout;
    }
    async execute(operation) {
        if (this.state === "OPEN") {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = "HALF_OPEN";
            }
            else {
                throw createError(ErrorCode.SERVICE_UNAVAILABLE, "Circuit breaker is OPEN - service temporarily unavailable", {
                    state: this.state,
                    failures: this.failures,
                    timeUntilReset: this.resetTimeout - (Date.now() - this.lastFailureTime),
                });
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        this.state = "CLOSED";
    }
    onFailure() {
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
export async function withRetry(operation, options = {}) {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
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
    throw lastError;
}
function calculateDelay(attempt, options) {
    let delay = options.baseDelay;
    if (options.exponentialBackoff) {
        delay = Math.min(options.baseDelay * Math.pow(2, attempt - 1), options.maxDelay);
    }
    if (options.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
    }
    return Math.floor(delay);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export class ErrorCollector {
    errors = [];
    maxErrors;
    constructor(maxErrors = 100) {
        this.maxErrors = maxErrors;
    }
    add(error) {
        this.errors.push(error);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }
    getRecentErrors(minutes = 10) {
        const cutoff = Date.now() - minutes * 60 * 1000;
        return this.errors.filter((error) => error.details?.timestamp && error.details.timestamp > cutoff);
    }
    getErrorsByCode(code) {
        return this.errors.filter((error) => error.code === code);
    }
    clear() {
        this.errors = [];
    }
    getSummary() {
        const byCode = this.errors.reduce((acc, error) => {
            acc[error.code] = (acc[error.code] || 0) + 1;
            return acc;
        }, {});
        return {
            total: this.errors.length,
            byCode,
            recent: this.getRecentErrors().length,
        };
    }
}
export function handleApiError(error, service) {
    if (isMcpError(error)) {
        return error;
    }
    // Handle HTTP errors
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        switch (status) {
            case 400:
                return createError(ErrorCode.INVALID_PARAMS, `${service} API: ${data?.message || "Bad request"}`, { service, status, data }, 400);
            case 401:
                return createError(ErrorCode.UNAUTHORIZED, `${service} API: Unauthorized - check API key`, { service, status }, 401);
            case 403:
                return createError(ErrorCode.FORBIDDEN, `${service} API: Forbidden - insufficient permissions`, { service, status }, 403);
            case 404:
                return createError(ErrorCode.NOT_FOUND, `${service} API: Resource not found`, { service, status }, 404);
            case 429:
                return createError(ErrorCode.RATE_LIMITED, `${service} API: Rate limit exceeded`, {
                    service,
                    status,
                    retryAfter: error.response.headers["retry-after"] || 60,
                }, 429);
            case 500:
            case 502:
            case 503:
                return createError(ErrorCode.SERVICE_UNAVAILABLE, `${service} API: Service temporarily unavailable`, { service, status }, status);
            case 504:
                return createError(ErrorCode.TIMEOUT, `${service} API: Request timeout`, { service, status }, 504);
            default:
                return createError(ErrorCode.API_ERROR, `${service} API error: ${data?.message || "Unknown error"}`, { service, status, data }, status);
        }
    }
    // Handle network errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        return createError(ErrorCode.NETWORK_ERROR, `Network error connecting to ${service}: ${error.message}`, { service, networkCode: error.code });
    }
    // Handle timeout errors
    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
        return createError(ErrorCode.TIMEOUT, `Request to ${service} timed out`, {
            service,
            originalMessage: error.message,
        });
    }
    // Default error
    return createError(ErrorCode.EXTERNAL_ERROR, `Unexpected ${service} error: ${error.message}`, { service, originalError: error.toString() });
}
export function createValidationError(field, value, expected) {
    return createError(ErrorCode.VALIDATION_ERROR, `Validation failed for field '${field}': expected ${expected}, got ${typeof value}`, { field, value, expected });
}
export function getErrorResponse(error) {
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
