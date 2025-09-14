/**
 * Performance tracking middleware for FastMCP server
 * Automatically tracks tool executions and API calls
 */

import { randomUUID } from 'crypto';

import { logger } from '../utils/logger.js';
import { performanceMonitor } from '../utils/performance-monitor.js';

/**
 * Decorator for tracking tool execution performance
 */
export function trackToolExecution(toolName: string) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operationId = `tool_${toolName}_${randomUUID()}`;
      const inputSize = JSON.stringify(args[0] || {}).length;

      performanceMonitor.startOperation(operationId);

      let streamingUsed = false;
      let progressReports = 0;

      // Check if streaming/progress context is used
      if (args.length > 1 && args[1]) {
        const context = args[1];
        if (context.streamContent) {
          const originalStreamContent = context.streamContent;
          context.streamContent = (...streamArgs: any[]) => {
            streamingUsed = true;
            return originalStreamContent(...streamArgs);
          };
        }

        if (context.reportProgress) {
          const originalReportProgress = context.reportProgress;
          context.reportProgress = (...progressArgs: any[]) => {
            progressReports++;
            return originalReportProgress(...progressArgs);
          };
        }
      }

      try {
        const startMemory = process.memoryUsage();
        const result = await method.apply(this, args);
        const endMemory = process.memoryUsage();

        const outputSize = result ? JSON.stringify(result).length : 0;

        performanceMonitor.recordToolExecution(
          operationId,
          toolName,
          inputSize,
          outputSize,
          streamingUsed,
          progressReports
        );

        // Log memory delta if significant
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        if (memoryDelta > 10 * 1024 * 1024) {
          // 10MB+
          logger.warn(
            {
              toolName,
              memoryDelta: Math.round(memoryDelta / 1024 / 1024),
              inputSize,
              outputSize,
            },
            'Tool execution used significant memory'
          );
        }

        return result;
      } catch (error) {
        performanceMonitor.recordToolExecution(
          operationId,
          toolName,
          inputSize,
          0,
          streamingUsed,
          progressReports
        );

        logger.error(
          {
            toolName,
            error: (error as Error).message,
            inputSize,
            streamingUsed,
            progressReports,
          },
          'Tool execution failed'
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for tracking API call performance
 */
export function trackAPICall(apiProvider: 'easypost' | 'veeqo' | 'claude', endpoint: string) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operationId = `api_${apiProvider}_${endpoint}_${randomUUID()}`;

      performanceMonitor.startOperation(operationId);

      let statusCode: number | undefined;
      let responseSize: number | undefined;
      const retryCount = 0;

      try {
        const result = await method.apply(this, args);

        // Extract response metadata if available
        if (result && typeof result === 'object') {
          statusCode = result.statusCode || result.status || 200;
          responseSize = JSON.stringify(result).length;
        }

        performanceMonitor.recordAPICall(
          operationId,
          apiProvider,
          endpoint,
          statusCode,
          responseSize,
          retryCount
        );

        return result;
      } catch (error) {
        // Try to extract status code from error
        if (error && typeof error === 'object') {
          statusCode = (error as any).statusCode || (error as any).status || 500;
        }

        performanceMonitor.recordAPICall(
          operationId,
          apiProvider,
          endpoint,
          statusCode,
          0,
          retryCount
        );

        logger.error(
          {
            apiProvider,
            endpoint,
            error: (error as Error).message,
            statusCode,
            retryCount,
          },
          'API call failed'
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper function to wrap async operations with performance tracking
 */
export async function trackOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const operationId = `op_${operationName}_${randomUUID()}`;

  performanceMonitor.startOperation(operationId);

  try {
    const result = await operation();
    performanceMonitor.endOperation(operationId, operationName, metadata);
    return result;
  } catch (error) {
    performanceMonitor.endOperation(operationId, operationName, {
      ...metadata,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Middleware to add performance monitoring to FastMCP server
 */
export function createPerformanceMiddleware() {
  return {
    beforeToolExecution: (toolName: string, args: any) => {
      logger.debug({ toolName, inputSize: JSON.stringify(args).length }, 'Tool execution starting');
    },

    afterToolExecution: (toolName: string, result: any, duration: number) => {
      logger.debug(
        {
          toolName,
          duration,
          outputSize: result ? JSON.stringify(result).length : 0,
        },
        'Tool execution completed'
      );
    },

    onError: (toolName: string, error: Error, duration: number) => {
      logger.error(
        {
          toolName,
          error: error.message,
          duration,
        },
        'Tool execution failed'
      );
    },
  };
}

/**
 * Performance health check function
 */
export function getPerformanceHealth(): {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: ReturnType<typeof performanceMonitor.getPerformanceSummary>;
  recommendations: ReturnType<typeof performanceMonitor.getOptimizationRecommendations>;
} {
  const metrics = performanceMonitor.getPerformanceSummary();
  const recommendations = performanceMonitor.getOptimizationRecommendations();

  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

  // Determine health status based on metrics
  const criticalIssues = recommendations.filter((r) => r.severity === 'critical');
  const warningIssues = recommendations.filter((r) => r.severity === 'warning');

  if (criticalIssues.length > 0) {
    status = 'critical';
  } else if (warningIssues.length > 2 || metrics.apiCallStats.errorRate > 5) {
    status = 'degraded';
  }

  return {
    status,
    metrics,
    recommendations,
  };
}
