/**
 * Enhanced Monitoring and Logging System
 * Provides comprehensive monitoring capabilities for the MCP server
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { logger } from './logger.js';
import { ErrorCode, McpError } from './errors.js';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
      timestamp: number;
    };
  };
  uptime: number;
  version: string;
  timestamp: number;
}

export interface SystemMetrics {
  memory: {
    used: number;
    free: number;
    percentage: number;
  };
  cpu: {
    percentage: number;
  };
  network: {
    activeConnections: number;
  };
  api: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

class MonitoringSystem extends EventEmitter {
  private metrics: MetricData[] = [];
  private healthChecks: Map<string, () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private startTime = Date.now();

  // Thresholds
  private readonly MEMORY_WARNING_THRESHOLD = Number(process.env.MEMORY_WARNING_THRESHOLD) || 400; // MB
  private readonly MEMORY_ERROR_THRESHOLD = Number(process.env.MEMORY_ERROR_THRESHOLD) || 500; // MB
  private readonly API_WARNING_THRESHOLD = Number(process.env.API_WARNING_THRESHOLD) || 2000; // ms
  private readonly API_ERROR_THRESHOLD = Number(process.env.API_ERROR_THRESHOLD) || 5000; // ms

  constructor() {
    super();
    this.setupDefaultHealthChecks();
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>, metadata?: Record<string, unknown>): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      labels,
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics (last 1000 entries)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Emit metric event for external processors
    this.emit('metric', metric);

    // Check thresholds and emit alerts
    this.checkMetricThresholds(metric);
  }

  /**
   * Record API call metrics
   */
  recordApiCall(
    provider: string,
    endpoint: string,
    duration: number,
    statusCode: number,
    success: boolean
  ): void {
    this.recordMetric('api_call_duration', duration, {
      provider,
      endpoint,
      status_code: statusCode.toString(),
      success: success.toString()
    });

    this.recordMetric('api_call_count', 1, {
      provider,
      endpoint,
      success: success.toString()
    });

    // Alert on slow API calls
    if (duration > this.API_WARNING_THRESHOLD) {
      logger.warn({
        provider,
        endpoint,
        duration,
        statusCode,
        threshold: this.API_WARNING_THRESHOLD
      }, 'Slow API call detected');

      if (duration > this.API_ERROR_THRESHOLD) {
        this.emit('alert', {
          type: 'api_performance',
          severity: 'high',
          message: `API call to ${provider}${endpoint} took ${duration}ms`,
          metadata: { provider, endpoint, duration, statusCode }
        });
      }
    }
  }

  /**
   * Record error occurrence
   */
  recordError(error: McpError | Error, context?: Record<string, unknown>): void {
    const errorCode = error instanceof McpError ? error.code : 'UNKNOWN_ERROR';
    const errorType = error.constructor.name;

    this.recordMetric('error_count', 1, {
      code: errorCode,
      type: errorType
    }, {
      message: error.message,
      stack: error.stack,
      context
    });

    // Emit error event
    this.emit('error', {
      error,
      context,
      timestamp: Date.now()
    });

    logger.error({
      errorCode,
      errorType,
      message: error.message,
      context
    }, 'Error recorded in monitoring');
  }

  /**
   * Register a health check
   */
  registerHealthCheck(
    name: string,
    check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>
  ): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Run all health checks and return status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, check] of this.healthChecks.entries()) {
      const startTime = performance.now();
      try {
        const result = await Promise.race([
          check(),
          new Promise<{ status: 'fail'; message: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);

        const duration = performance.now() - startTime;
        checks[name] = {
          ...result,
          duration,
          timestamp: Date.now()
        };

        // Update overall status
        if (result.status === 'fail') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }

      } catch (error) {
        const duration = performance.now() - startTime;
        checks[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration,
          timestamp: Date.now()
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: Date.now()
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = memoryUsage.heapUsed / (1024 * 1024);
    const memoryFreeMB = (memoryUsage.heapTotal - memoryUsage.heapUsed) / (1024 * 1024);
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Calculate API metrics from recent data
    const recentApiMetrics = this.getRecentMetrics('api_call_duration', 300000); // Last 5 minutes
    const recentApiCalls = this.getRecentMetrics('api_call_count', 300000);
    const failedApiCalls = recentApiCalls.filter(m => m.labels?.success === 'false');

    const totalRequests = recentApiCalls.reduce((sum, metric) => sum + metric.value, 0);
    const errorRate = totalRequests > 0 ? (failedApiCalls.length / totalRequests) * 100 : 0;
    const averageResponseTime = recentApiMetrics.length > 0
      ? recentApiMetrics.reduce((sum, metric) => sum + metric.value, 0) / recentApiMetrics.length
      : 0;

    return {
      memory: {
        used: memoryUsedMB,
        free: memoryFreeMB,
        percentage: memoryPercentage
      },
      cpu: {
        percentage: 0 // TODO: Implement CPU monitoring
      },
      network: {
        activeConnections: 0 // TODO: Implement connection tracking
      },
      api: {
        totalRequests,
        errorRate,
        averageResponseTime
      }
    };
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring(): void {
    // System metrics collection
    const systemMetricsInterval = setInterval(() => {
      const metrics = this.getSystemMetrics();

      this.recordMetric('memory_usage_mb', metrics.memory.used);
      this.recordMetric('memory_percentage', metrics.memory.percentage);
      this.recordMetric('api_error_rate', metrics.api.errorRate);
      this.recordMetric('api_avg_response_time', metrics.api.averageResponseTime);

    }, Number(process.env.PERFORMANCE_LOG_INTERVAL) || 60000);

    // Health check interval
    const healthCheckInterval = setInterval(async () => {
      const healthStatus = await this.getHealthStatus();

      if (healthStatus.status !== 'healthy') {
        logger.warn({
          status: healthStatus.status,
          failedChecks: Object.entries(healthStatus.checks)
            .filter(([_, check]) => check.status !== 'pass')
            .map(([name, check]) => ({ name, status: check.status, message: check.message }))
        }, 'System health degraded');
      }

    }, Number(process.env.HEALTH_CHECK_INTERVAL) || 30000);

    this.intervals.set('systemMetrics', systemMetricsInterval);
    this.intervals.set('healthCheck', healthCheckInterval);

    logger.info({
      systemMetricsInterval: Number(process.env.PERFORMANCE_LOG_INTERVAL) || 60000,
      healthCheckInterval: Number(process.env.HEALTH_CHECK_INTERVAL) || 30000
    }, 'Monitoring system started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    for (const [name, interval] of this.intervals.entries()) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
    logger.info('Monitoring system stopped');
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(name: string, windowMs: number): MetricData[] {
    const cutoff = Date.now() - windowMs;
    return this.metrics.filter(m => m.name === name && m.timestamp > cutoff);
  }

  /**
   * Check metric thresholds and emit alerts
   */
  private checkMetricThresholds(metric: MetricData): void {
    if (metric.name === 'memory_usage_mb') {
      if (metric.value > this.MEMORY_ERROR_THRESHOLD) {
        this.emit('alert', {
          type: 'memory',
          severity: 'critical',
          message: `Memory usage critical: ${metric.value.toFixed(1)}MB`,
          metadata: { threshold: this.MEMORY_ERROR_THRESHOLD }
        });
      } else if (metric.value > this.MEMORY_WARNING_THRESHOLD) {
        this.emit('alert', {
          type: 'memory',
          severity: 'warning',
          message: `Memory usage high: ${metric.value.toFixed(1)}MB`,
          metadata: { threshold: this.MEMORY_WARNING_THRESHOLD }
        });
      }
    }
  }

  /**
   * Setup default health checks
   */
  private setupDefaultHealthChecks(): void {
    // Memory health check
    this.registerHealthCheck('memory', async () => {
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = memoryUsage.heapUsed / (1024 * 1024);

      if (memoryUsedMB > this.MEMORY_ERROR_THRESHOLD) {
        return {
          status: 'fail',
          message: `Memory usage critical: ${memoryUsedMB.toFixed(1)}MB`
        };
      } else if (memoryUsedMB > this.MEMORY_WARNING_THRESHOLD) {
        return {
          status: 'warn',
          message: `Memory usage high: ${memoryUsedMB.toFixed(1)}MB`
        };
      }

      return {
        status: 'pass',
        message: `Memory usage normal: ${memoryUsedMB.toFixed(1)}MB`
      };
    });

    // API connectivity health check
    this.registerHealthCheck('api_connectivity', async () => {
      // Check recent API errors
      const recentErrors = this.getRecentMetrics('error_count', 300000); // Last 5 minutes
      const apiErrors = recentErrors.filter(m =>
        m.labels?.code === ErrorCode.API_ERROR ||
        m.labels?.code === ErrorCode.TIMEOUT ||
        m.labels?.code === ErrorCode.NETWORK_ERROR
      );

      if (apiErrors.length > 10) {
        return {
          status: 'fail',
          message: `High API error rate: ${apiErrors.length} errors in 5 minutes`
        };
      } else if (apiErrors.length > 5) {
        return {
          status: 'warn',
          message: `Elevated API error rate: ${apiErrors.length} errors in 5 minutes`
        };
      }

      return {
        status: 'pass',
        message: 'API connectivity stable'
      };
    });
  }
}

// Create singleton instance
export const monitoring = new MonitoringSystem();

// Export types and utility functions
export function createTimer() {
  const start = performance.now();
  return {
    end(): number {
      return performance.now() - start;
    }
  };
}

export function withMonitoring<T extends any[], R>(
  name: string,
  fn: (..._args: T) => Promise<R>,
  labels?: Record<string, string>
): (..._args: T) => Promise<R> {
  return async (..._args: T): Promise<R> => {
    const timer = createTimer();

    try {
      const result = await fn(..._args);
      const duration = timer.end();

      monitoring.recordMetric(`${name}_duration`, duration, labels);
      monitoring.recordMetric(`${name}_success`, 1, labels);

      return result;
    } catch (error) {
      const duration = timer.end();

      monitoring.recordMetric(`${name}_duration`, duration, { ...labels, success: 'false' });
      monitoring.recordMetric(`${name}_error`, 1, labels);

      if (error instanceof Error) {
        monitoring.recordError(error, { operation: name, args: _args.slice(0, 2) }); // Limit args to prevent huge logs
      }

      throw error;
    }
  };
}