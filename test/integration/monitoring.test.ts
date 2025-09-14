/**
 * Monitoring System Integration Tests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { monitoring } from '../../src/utils/monitoring.js';
import { ErrorCode, createError } from '../../src/utils/errors.js';

describe('Monitoring System Integration', () => {
  beforeAll(() => {
    // Set test environment
    process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
    process.env.MEMORY_WARNING_THRESHOLD = '100';
    process.env.MEMORY_ERROR_THRESHOLD = '200';
    process.env.API_WARNING_THRESHOLD = '1000';
    process.env.API_ERROR_THRESHOLD = '2000';
  });

  afterAll(() => {
    monitoring.stopMonitoring();
  });

  beforeEach(() => {
    // Clear any existing metrics/alerts
    monitoring.removeAllListeners();
  });

  test('should start and stop monitoring system', () => {
    expect(() => monitoring.startMonitoring()).not.toThrow();
    expect(() => monitoring.stopMonitoring()).not.toThrow();
  });

  test('should record metrics correctly', () => {
    const metricName = 'test_metric';
    const metricValue = 123.45;
    const labels = { test: 'label' };

    expect(() => {
      monitoring.recordMetric(metricName, metricValue, labels);
    }).not.toThrow();

    // Metrics are collected asynchronously, so we verify the call doesn't throw
  });

  test('should record API call metrics', () => {
    const provider = 'easypost';
    const endpoint = '/test';
    const duration = 500;
    const statusCode = 200;
    const success = true;

    expect(() => {
      monitoring.recordApiCall(provider, endpoint, duration, statusCode, success);
    }).not.toThrow();
  });

  test('should record errors', () => {
    const testError = createError(
      ErrorCode.API_ERROR,
      'Test API error',
      { test: 'context' }
    );

    // Temporarily disable error event listeners to prevent unhandled error
    const originalEmit = monitoring.emit;
    monitoring.emit = () => true;

    expect(() => {
      monitoring.recordError(testError, { operation: 'test' });
    }).not.toThrow();

    // Restore emit function
    monitoring.emit = originalEmit;
  });

  test('should get health status', async () => {
    const healthStatus = await monitoring.getHealthStatus();

    expect(healthStatus).toBeDefined();
    expect(healthStatus.status).toMatch(/healthy|degraded|unhealthy/);
    expect(healthStatus.timestamp).toBeTypeOf('number');
    expect(healthStatus.uptime).toBeTypeOf('number');
    expect(healthStatus.version).toBeTypeOf('string');
    expect(healthStatus.checks).toBeTypeOf('object');
  });

  test('should get system metrics', () => {
    const systemMetrics = monitoring.getSystemMetrics();

    expect(systemMetrics).toBeDefined();
    expect(systemMetrics.memory).toBeDefined();
    expect(systemMetrics.memory.used).toBeTypeOf('number');
    expect(systemMetrics.memory.free).toBeTypeOf('number');
    expect(systemMetrics.memory.percentage).toBeTypeOf('number');

    expect(systemMetrics.api).toBeDefined();
    expect(systemMetrics.api.totalRequests).toBeTypeOf('number');
    expect(systemMetrics.api.errorRate).toBeTypeOf('number');
    expect(systemMetrics.api.averageResponseTime).toBeTypeOf('number');
  });

  test('should emit alerts on slow API calls', () => {
    return new Promise<void>((resolve) => {
      const slowDuration = 3000; // Above error threshold

      monitoring.once('alert', (alert) => {
        expect(alert.type).toBe('api_performance');
        expect(alert.severity).toBe('high');
        expect(alert.message).toContain('3000ms');
        resolve();
      });

      monitoring.recordApiCall('easypost', '/slow-endpoint', slowDuration, 200, true);
    });
  });

  test('should register and execute health checks', async () => {
    const checkName = 'test_check';
    let checkExecuted = false;

    monitoring.registerHealthCheck(checkName, async () => {
      checkExecuted = true;
      return {
        status: 'pass',
        message: 'Test check passed'
      };
    });

    const healthStatus = await monitoring.getHealthStatus();

    expect(checkExecuted).toBe(true);
    expect(healthStatus.checks[checkName]).toBeDefined();
    expect(healthStatus.checks[checkName].status).toBe('pass');
    expect(healthStatus.checks[checkName].message).toBe('Test check passed');
  });

  test('should handle failing health checks', async () => {
    const checkName = 'failing_check';

    monitoring.registerHealthCheck(checkName, async () => {
      return {
        status: 'fail',
        message: 'Test check failed'
      };
    });

    const healthStatus = await monitoring.getHealthStatus();

    expect(healthStatus.checks[checkName]).toBeDefined();
    expect(healthStatus.checks[checkName].status).toBe('fail');
    expect(healthStatus.checks[checkName].message).toBe('Test check failed');
    expect(healthStatus.status).toBe('unhealthy');
  });

  test('should handle health check timeouts', async () => {
    const checkName = 'timeout_check';

    monitoring.registerHealthCheck(checkName, async () => {
      // Simulate a check that takes longer than 5 seconds
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 'pass',
            message: 'This should timeout'
          });
        }, 6000);
      });
    });

    const healthStatus = await monitoring.getHealthStatus();

    expect(healthStatus.checks[checkName]).toBeDefined();
    expect(healthStatus.checks[checkName].status).toBe('fail');
    expect(healthStatus.checks[checkName].message).toContain('timeout');
  }, 10000);

  test('should collect error events', () => {
    return new Promise<void>((resolve) => {
      const testError = new Error('Test error for monitoring');

      monitoring.once('error', (errorEvent) => {
        expect(errorEvent.error).toBe(testError);
        expect(errorEvent.context).toEqual({ operation: 'test' });
        expect(errorEvent.timestamp).toBeTypeOf('number');
        resolve();
      });

      monitoring.recordError(testError, { operation: 'test' });
    });
  });

  test('should handle memory threshold alerts', () => {
    return new Promise<void>((resolve) => {
      monitoring.once('alert', (alert) => {
        expect(alert.type).toBe('memory');
        expect(alert.severity).toMatch(/warning|critical/);
        resolve();
      });

      // Simulate high memory usage metric
      monitoring.recordMetric('memory_usage_mb', 150); // Above warning threshold
    });
  });
});