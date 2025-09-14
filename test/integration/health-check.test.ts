/**
 * Health Check Integration Tests
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { health, getHealthStatus, checkApiService } from '../../src/core/tools/health.js';

describe('Health Check Integration', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.EASYPOST_API_KEY = 'mock';
    process.env.VEEQO_API_KEY = 'mock';
    process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
    process.env.NODE_ENV = 'test';
  });

  test('should return basic health status', async () => {
    const healthResult = await health();

    expect(healthResult).toBeDefined();
    expect(healthResult.status).toMatch(/healthy|degraded|unhealthy/);
    expect(healthResult.timestamp).toBeTypeOf('string');
    expect(healthResult.latency_ms).toBeTypeOf('number');

    // Latency should be reasonable (< 1000ms for a health check)
    expect(healthResult.latency_ms).toBeLessThan(1000);
  });

  test('should return comprehensive health status', async () => {
    const healthStatus = await getHealthStatus();

    expect(healthStatus).toBeDefined();
    expect(healthStatus.status).toMatch(/healthy|degraded|unhealthy/);
    expect(healthStatus.timestamp).toBeTypeOf('number');
    expect(healthStatus.uptime).toBeTypeOf('number');
    expect(healthStatus.version).toBeTypeOf('string');
    expect(healthStatus.environment).toBe('test');

    // Check services structure
    expect(healthStatus.services).toBeDefined();
    expect(healthStatus.services.easypost).toBeDefined();
    expect(healthStatus.services.veeqo).toBeDefined();
    expect(healthStatus.services.monitoring).toBeDefined();

    // Check system metrics structure
    expect(healthStatus.system).toBeDefined();
    expect(healthStatus.system.memory).toBeDefined();
    expect(healthStatus.system.performance).toBeDefined();

    // Check health checks structure
    expect(healthStatus.checks).toBeDefined();
    expect(typeof healthStatus.checks).toBe('object');
  });

  test('should detect mock API services', async () => {
    const healthStatus = await getHealthStatus();

    expect(healthStatus.services.easypost.status).toBe('mock');
    expect(healthStatus.services.veeqo.status).toBe('mock');
    expect(healthStatus.services.easypost.lastCheck).toBeTypeOf('number');
    expect(healthStatus.services.veeqo.lastCheck).toBeTypeOf('number');
  });

  test('should show monitoring status', async () => {
    const healthStatus = await getHealthStatus();

    expect(healthStatus.services.monitoring.status).toBe('enabled');
    expect(healthStatus.services.monitoring.metricsCollected).toBeTypeOf('number');
    expect(healthStatus.services.monitoring.alertsActive).toBeTypeOf('number');
  });

  test('should include memory metrics', async () => {
    const healthStatus = await getHealthStatus();

    expect(healthStatus.system.memory.used).toBeTypeOf('number');
    expect(healthStatus.system.memory.free).toBeTypeOf('number');
    expect(healthStatus.system.memory.percentage).toBeTypeOf('number');

    // Memory percentage should be between 0 and 100
    expect(healthStatus.system.memory.percentage).toBeGreaterThanOrEqual(0);
    expect(healthStatus.system.memory.percentage).toBeLessThanOrEqual(100);
  });

  test('should include performance metrics', async () => {
    const healthStatus = await getHealthStatus();

    expect(healthStatus.system.performance.totalRequests).toBeTypeOf('number');
    expect(healthStatus.system.performance.errorRate).toBeTypeOf('number');
    expect(healthStatus.system.performance.averageResponseTime).toBeTypeOf('number');

    // Error rate should be between 0 and 100
    expect(healthStatus.system.performance.errorRate).toBeGreaterThanOrEqual(0);
    expect(healthStatus.system.performance.errorRate).toBeLessThanOrEqual(100);
  });

  test('should handle health check errors gracefully', async () => {
    // Temporarily break something to test error handling
    const originalEnv = process.env.ENABLE_PERFORMANCE_MONITORING;
    delete process.env.ENABLE_PERFORMANCE_MONITORING;

    const healthResult = await health();

    // Should still return a result even with errors
    expect(healthResult).toBeDefined();
    expect(healthResult.status).toBeDefined();

    // Restore environment
    process.env.ENABLE_PERFORMANCE_MONITORING = originalEnv;
  });

  test('should execute default health checks', async () => {
    const healthStatus = await getHealthStatus();

    // Should have default health checks
    expect(healthStatus.checks).toBeDefined();

    // Check for default health checks (memory, api_connectivity)
    const checkNames = Object.keys(healthStatus.checks);
    expect(checkNames.length).toBeGreaterThan(0);

    // Each check should have proper structure
    for (const [name, check] of Object.entries(healthStatus.checks)) {
      expect(name).toBeTypeOf('string');
      expect(check.status).toMatch(/pass|fail|warn/);
      expect(check.timestamp).toBeTypeOf('number');

      if (check.message) {
        expect(check.message).toBeTypeOf('string');
      }

      if (check.duration) {
        expect(check.duration).toBeTypeOf('number');
        expect(check.duration).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should determine overall health status correctly', async () => {
    const healthStatus = await getHealthStatus();

    const checks = Object.values(healthStatus.checks);
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');

    if (hasFailures) {
      expect(healthStatus.status).toBe('unhealthy');
    } else if (hasWarnings) {
      expect(healthStatus.status).toBe('degraded');
    } else {
      expect(healthStatus.status).toBe('healthy');
    }
  });

  test('should have reasonable uptime', async () => {
    const healthStatus = await getHealthStatus();

    // Uptime should be positive and reasonable (less than 1 hour for tests)
    expect(healthStatus.uptime).toBeTypeOf('number');
    expect(healthStatus.uptime).toBeGreaterThan(0);
    expect(healthStatus.uptime).toBeLessThan(3600000); // 1 hour in milliseconds
  });

  test('should validate timestamp freshness', async () => {
    const before = Date.now();
    const healthStatus = await getHealthStatus();
    const after = Date.now();

    expect(healthStatus.timestamp).toBeGreaterThanOrEqual(before);
    expect(healthStatus.timestamp).toBeLessThanOrEqual(after);
  });
});