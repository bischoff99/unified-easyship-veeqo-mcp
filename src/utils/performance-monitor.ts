/**
 * Performance monitoring utilities for FastMCP server
 * Tracks API performance, memory usage, and optimization opportunities
 */

import { performance } from 'perf_hooks';

import { logger } from './logger.js';

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface APICallMetrics extends PerformanceMetrics {
  apiProvider: 'easypost' | 'veeqo' | 'claude';
  endpoint: string;
  statusCode?: number;
  responseSize?: number;
  retryCount?: number;
}

export interface ToolExecutionMetrics extends PerformanceMetrics {
  toolName: string;
  inputSize: number;
  outputSize?: number;
  streamingUsed: boolean;
  progressReports: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private apiMetrics: APICallMetrics[] = [];
  private toolMetrics: ToolExecutionMetrics[] = [];
  private readonly activeOperations = new Map<string, number>();

  // Performance thresholds (milliseconds)
  private readonly THRESHOLDS = {
    API_CALL_WARNING: 2000,
    API_CALL_ERROR: 5000,
    TOOL_EXECUTION_WARNING: 3000,
    TOOL_EXECUTION_ERROR: 10000,
    MEMORY_WARNING: 500 * 1024 * 1024, // 500MB
    MEMORY_ERROR: 1024 * 1024 * 1024, // 1GB
  };

  /**
   * Start timing an operation
   */
  startOperation(operationId: string): void {
    this.activeOperations.set(operationId, performance.now());
  }

  /**
   * End timing an operation and record metrics
   */
  endOperation(
    operationId: string,
    operationName: string,
    metadata?: Record<string, unknown>
  ): PerformanceMetrics {
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      logger.warn({ operationId }, 'Operation not found in active operations');
      return this.createMetrics(operationName, 0, metadata);
    }

    this.activeOperations.delete(operationId);
    const duration = performance.now() - startTime;
    const metrics = this.createMetrics(operationName, duration, metadata);

    this.metrics.push(metrics);
    this.checkThresholds(metrics);

    return metrics;
  }

  /**
   * Record API call metrics
   */
  recordAPICall(
    operationId: string,
    apiProvider: 'easypost' | 'veeqo' | 'claude',
    endpoint: string,
    statusCode?: number,
    responseSize?: number,
    retryCount = 0
  ): APICallMetrics {
    const baseMetrics = this.endOperation(operationId, `${apiProvider}_${endpoint}`);

    const apiMetrics: APICallMetrics = {
      ...baseMetrics,
      apiProvider,
      endpoint,
      statusCode,
      responseSize,
      retryCount,
    };

    this.apiMetrics.push(apiMetrics);
    this.checkAPIThresholds(apiMetrics);

    return apiMetrics;
  }

  /**
   * Record tool execution metrics
   */
  recordToolExecution(
    operationId: string,
    toolName: string,
    inputSize: number,
    outputSize?: number,
    streamingUsed = false,
    progressReports = 0
  ): ToolExecutionMetrics {
    const baseMetrics = this.endOperation(operationId, `tool_${toolName}`);

    const toolMetrics: ToolExecutionMetrics = {
      ...baseMetrics,
      toolName,
      inputSize,
      outputSize,
      streamingUsed,
      progressReports,
    };

    this.toolMetrics.push(toolMetrics);
    this.checkToolThresholds(toolMetrics);

    return toolMetrics;
  }

  /**
   * Get performance summary for the last N minutes
   */
  getPerformanceSummary(minutesBack = 10): {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: PerformanceMetrics[];
    apiCallStats: {
      totalCalls: number;
      averageResponseTime: number;
      errorRate: number;
      slowestCalls: APICallMetrics[];
    };
    toolStats: {
      totalExecutions: number;
      averageExecutionTime: number;
      mostUsedTools: { name: string; count: number; avgDuration: number }[];
    };
    memoryStats: {
      averageUsage: number;
      peakUsage: number;
      currentUsage: NodeJS.MemoryUsage;
    };
  } {
    const cutoffTime = Date.now() - minutesBack * 60 * 1000;

    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoffTime);
    const recentApiMetrics = this.apiMetrics.filter((m) => m.timestamp > cutoffTime);
    const recentToolMetrics = this.toolMetrics.filter((m) => m.timestamp > cutoffTime);

    // Overall stats
    const totalOperations = recentMetrics.length;
    const averageDuration =
      totalOperations > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
        : 0;

    const sortedMetrics = [...recentMetrics].sort((a, b) => b.duration - a.duration);
    const slowestOperations = sortedMetrics.slice(0, 5);

    // API call stats
    const totalCalls = recentApiMetrics.length;
    const averageResponseTime =
      totalCalls > 0 ? recentApiMetrics.reduce((sum, m) => sum + m.duration, 0) / totalCalls : 0;

    const errorCalls = recentApiMetrics.filter(
      (m) => m.statusCode && (m.statusCode >= 400 || m.duration > this.THRESHOLDS.API_CALL_ERROR)
    ).length;
    const errorRate = totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0;

    const sortedApiMetrics = [...recentApiMetrics].sort((a, b) => b.duration - a.duration);
    const slowestCalls = sortedApiMetrics.slice(0, 5);

    // Tool stats
    const totalExecutions = recentToolMetrics.length;
    const averageExecutionTime =
      totalExecutions > 0
        ? recentToolMetrics.reduce((sum, m) => sum + m.duration, 0) / totalExecutions
        : 0;

    const toolUsage = recentToolMetrics.reduce(
      (acc, m) => {
        if (!acc[m.toolName]) {
          acc[m.toolName] = { count: 0, totalDuration: 0 };
        }
        acc[m.toolName].count++;
        acc[m.toolName].totalDuration += m.duration;
        return acc;
      },
      {} as Record<string, { count: number; totalDuration: number }>
    );

    const mostUsedTools = Object.entries(toolUsage)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Memory stats
    const memoryUsages = recentMetrics.map((m) => m.memoryUsage.heapUsed);
    const averageUsage =
      memoryUsages.length > 0
        ? memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length
        : 0;
    const peakUsage = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;
    const currentUsage = process.memoryUsage();

    return {
      totalOperations,
      averageDuration,
      slowestOperations,
      apiCallStats: {
        totalCalls,
        averageResponseTime,
        errorRate,
        slowestCalls,
      },
      toolStats: {
        totalExecutions,
        averageExecutionTime,
        mostUsedTools,
      },
      memoryStats: {
        averageUsage,
        peakUsage,
        currentUsage,
      },
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): {
    category: 'api' | 'tools' | 'memory';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    recommendation: string;
  }[] {
    const recommendations = [];
    const summary = this.getPerformanceSummary();

    // API optimization recommendations
    if (summary.apiCallStats.errorRate > 10) {
      recommendations.push({
        category: 'api' as const,
        severity: 'critical' as const,
        title: 'High API Error Rate',
        description: `API error rate is ${summary.apiCallStats.errorRate.toFixed(1)}%`,
        recommendation: 'Implement circuit breakers and exponential backoff retry logic',
      });
    }

    if (summary.apiCallStats.averageResponseTime > this.THRESHOLDS.API_CALL_WARNING) {
      recommendations.push({
        category: 'api' as const,
        severity: 'warning' as const,
        title: 'Slow API Responses',
        description: `Average API response time is ${summary.apiCallStats.averageResponseTime.toFixed(0)}ms`,
        recommendation: 'Consider implementing response caching or request batching',
      });
    }

    // Tool optimization recommendations
    if (summary.toolStats.averageExecutionTime > this.THRESHOLDS.TOOL_EXECUTION_WARNING) {
      recommendations.push({
        category: 'tools' as const,
        severity: 'warning' as const,
        title: 'Slow Tool Execution',
        description: `Average tool execution time is ${summary.toolStats.averageExecutionTime.toFixed(0)}ms`,
        recommendation:
          'Implement streaming responses and progress reporting for long-running operations',
      });
    }

    // Memory optimization recommendations
    if (summary.memoryStats.currentUsage.heapUsed > this.THRESHOLDS.MEMORY_WARNING) {
      recommendations.push({
        category: 'memory' as const,
        severity: (summary.memoryStats.currentUsage.heapUsed > this.THRESHOLDS.MEMORY_ERROR
          ? 'critical'
          : 'warning') as 'info' | 'warning' | 'critical',
        title: 'High Memory Usage',
        description: `Current heap usage is ${(summary.memoryStats.currentUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        recommendation: 'Review data structures and implement proper cleanup for large operations',
      });
    }

    return recommendations;
  }

  /**
   * Clear old metrics (keep last 24 hours)
   */
  cleanupMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    this.metrics = this.metrics.filter((m) => m.timestamp > cutoffTime);
    this.apiMetrics = this.apiMetrics.filter((m) => m.timestamp > cutoffTime);
    this.toolMetrics = this.toolMetrics.filter((m) => m.timestamp > cutoffTime);
  }

  private createMetrics(
    operationName: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): PerformanceMetrics {
    return {
      operationName,
      duration,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
      metadata,
    };
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    if (metrics.duration > this.THRESHOLDS.API_CALL_ERROR) {
      logger.error(
        {
          operation: metrics.operationName,
          duration: metrics.duration,
          memoryUsage: metrics.memoryUsage,
        },
        'Operation exceeded error threshold'
      );
    } else if (metrics.duration > this.THRESHOLDS.API_CALL_WARNING) {
      logger.warn(
        {
          operation: metrics.operationName,
          duration: metrics.duration,
        },
        'Operation exceeded warning threshold'
      );
    }

    if (metrics.memoryUsage.heapUsed > this.THRESHOLDS.MEMORY_ERROR) {
      logger.error(
        {
          memoryUsage: metrics.memoryUsage,
          operation: metrics.operationName,
        },
        'Memory usage exceeded error threshold'
      );
    } else if (metrics.memoryUsage.heapUsed > this.THRESHOLDS.MEMORY_WARNING) {
      logger.warn(
        {
          memoryUsage: metrics.memoryUsage,
          operation: metrics.operationName,
        },
        'Memory usage exceeded warning threshold'
      );
    }
  }

  private checkAPIThresholds(metrics: APICallMetrics): void {
    if (metrics.retryCount && metrics.retryCount > 0) {
      logger.warn(
        {
          apiProvider: metrics.apiProvider,
          endpoint: metrics.endpoint,
          retryCount: metrics.retryCount,
          duration: metrics.duration,
        },
        'API call required retries'
      );
    }

    if (metrics.statusCode && metrics.statusCode >= 400) {
      logger.error(
        {
          apiProvider: metrics.apiProvider,
          endpoint: metrics.endpoint,
          statusCode: metrics.statusCode,
          duration: metrics.duration,
        },
        'API call failed with error status'
      );
    }
  }

  private checkToolThresholds(metrics: ToolExecutionMetrics): void {
    if (metrics.duration > this.THRESHOLDS.TOOL_EXECUTION_ERROR) {
      logger.error(
        {
          toolName: metrics.toolName,
          duration: metrics.duration,
          inputSize: metrics.inputSize,
          streamingUsed: metrics.streamingUsed,
        },
        'Tool execution exceeded error threshold'
      );
    }

    // Recommend streaming for large operations
    if (
      metrics.duration > this.THRESHOLDS.TOOL_EXECUTION_WARNING &&
      !metrics.streamingUsed &&
      metrics.progressReports === 0
    ) {
      logger.info(
        {
          toolName: metrics.toolName,
          duration: metrics.duration,
        },
        'Consider implementing streaming or progress reporting for this tool'
      );
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-cleanup every hour
setInterval(
  () => {
    performanceMonitor.cleanupMetrics();
  },
  60 * 60 * 1000
);
