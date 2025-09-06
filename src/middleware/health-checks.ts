/**
 * Health check middleware for FastMCP server
 * Provides comprehensive health monitoring for deployment readiness
 */

import { logger } from '../utils/logger.js';
import { performanceMonitor } from '../utils/performance-monitor.js';

type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface SystemHealth {
  status: HealthStatus;
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
  timestamp: number;
}

class HealthCheckManager {
  private readonly checks = new Map<string, () => Promise<HealthCheckResult>>();
  private readonly startTime = Date.now();

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, checkFunction: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<SystemHealth> {
    const results: HealthCheckResult[] = [];

    for (const [name, checkFunction] of this.checks) {
      try {
        const result = await checkFunction();
        results.push(result);
      } catch (error) {
        results.push({
          name,
          status: 'critical',
          message: `Health check failed: ${(error as Error).message}`,
          timestamp: Date.now(),
        });
      }
    }

    // Determine overall status
    const criticalChecks = results.filter((r) => r.status === 'critical');
    const degradedChecks = results.filter((r) => r.status === 'degraded');

    let overallStatus: HealthStatus = 'healthy';
    if (criticalChecks.length > 0) {
      overallStatus = 'critical';
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks: results,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: Date.now(),
    };
  }

  /**
   * Get simple readiness probe
   */
  async isReady(): Promise<boolean> {
    const health = await this.runHealthChecks();
    return health.status !== 'critical';
  }

  /**
   * Get simple liveness probe
   */
  async isAlive(): Promise<boolean> {
    try {
      // Basic checks for process health
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Check if memory usage is reasonable (less than 2GB)
      if (memoryUsage.heapUsed > 2 * 1024 * 1024 * 1024) {
        return false;
      }

      // Check if process has been running for at least a few seconds
      if (uptime < 5) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private registerDefaultChecks(): void {
    // Memory usage check
    this.registerCheck('memory', async (): Promise<HealthCheckResult> => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

      let status: HealthStatus = 'healthy';
      let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`;

      if (heapUsedMB > 1024) {
        // 1GB+
        status = 'critical';
        message += ' - Critical memory usage';
      } else if (heapUsedMB > 512) {
        // 512MB+
        status = 'degraded';
        message += ' - High memory usage';
      }

      return {
        name: 'memory',
        status,
        message,
        details: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
        },
        timestamp: Date.now(),
      };
    });

    // Process uptime check
    this.registerCheck('uptime', async (): Promise<HealthCheckResult> => {
      const uptime = process.uptime();
      const uptimeHours = Math.round((uptime / 3600) * 100) / 100;

      return {
        name: 'uptime',
        status: uptime > 10 ? 'healthy' : 'degraded',
        message: `Process uptime: ${uptimeHours} hours`,
        details: {
          uptime,
          startTime: this.startTime,
        },
        timestamp: Date.now(),
      };
    });

    // Performance metrics check
    this.registerCheck('performance', async (): Promise<HealthCheckResult> => {
      const summary = performanceMonitor.getPerformanceSummary(5); // Last 5 minutes
      const recommendations = performanceMonitor.getOptimizationRecommendations();

      const criticalIssues = recommendations.filter((r) => r.severity === 'critical');
      const warningIssues = recommendations.filter((r) => r.severity === 'warning');

      let status: HealthStatus = 'healthy';
      let message = `Performance: ${summary.totalOperations} operations, avg ${Math.round(summary.averageDuration)}ms`;

      if (criticalIssues.length > 0) {
        status = 'critical';
        message += ` - ${criticalIssues.length} critical issues`;
      } else if (warningIssues.length > 2) {
        status = 'degraded';
        message += ` - ${warningIssues.length} performance warnings`;
      }

      return {
        name: 'performance',
        status,
        message,
        details: {
          summary,
          recommendations: recommendations.slice(0, 5), // Top 5 recommendations
        },
        timestamp: Date.now(),
      };
    });

    // Environment configuration check
    this.registerCheck('environment', async (): Promise<HealthCheckResult> => {
      const requiredEnvVars = ['EASYPOST_API_KEY', 'VEEQO_API_KEY'];
      const missingVars = requiredEnvVars.filter(
        (varName) => !process.env[varName] || process.env[varName] === ''
      );

      let status: HealthStatus = 'healthy';
      let message = 'Environment configuration is valid';

      if (missingVars.length > 0) {
        status = 'critical';
        message = `Missing required environment variables: ${missingVars.join(', ')}`;
      }

      // Check for test vs production keys
      const easyPostKey = process.env.EASYPOST_API_KEY || '';
      const veeqoKey = process.env.VEEQO_API_KEY || '';

      if (
        process.env.NODE_ENV === 'production' &&
        (easyPostKey.includes('test') || veeqoKey.includes('test'))
      ) {
        status = 'critical';
        message = 'Production environment using test API keys';
      }

      return {
        name: 'environment',
        status,
        message,
        details: {
          nodeEnv: process.env.NODE_ENV,
          logLevel: process.env.LOG_LEVEL,
          hasEasyPostKey: !!process.env.EASYPOST_API_KEY,
          hasVeeqoKey: !!process.env.VEEQO_API_KEY,
          easyPostKeyType: easyPostKey.includes('test') ? 'test' : 'live',
        },
        timestamp: Date.now(),
      };
    });

    // External API connectivity check
    this.registerCheck('external_apis', async (): Promise<HealthCheckResult> => {
      const results = {
        easypost: 'unknown',
        veeqo: 'unknown',
      };

      // Simple connectivity test (don't actually call APIs to avoid rate limits)
      // In production, you might want to implement actual health check endpoints

      try {
        // Check if DNS resolution works for APIs
        const dns = await import('dns');
        await new Promise((resolve, reject) => {
          dns.resolve('api.easypost.com', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });
        });
        results.easypost = 'reachable';
      } catch {
        results.easypost = 'unreachable';
      }

      try {
        const dns = await import('dns');
        await new Promise<void>((resolve, reject) => {
          dns.resolve('api.veeqo.com', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        results.veeqo = 'reachable';
      } catch {
        results.veeqo = 'unreachable';
      }

      const unreachableApis = Object.entries(results).filter(
        ([, status]) => status === 'unreachable'
      );

      let status: HealthStatus = 'healthy';
      let message = 'All external APIs are reachable';

      if (unreachableApis.length > 0) {
        status = 'degraded';
        message = `Some APIs unreachable: ${unreachableApis.map(([api]) => api).join(', ')}`;
      }

      return {
        name: 'external_apis',
        status,
        message,
        details: results,
        timestamp: Date.now(),
      };
    });
  }
}

// Export singleton instance
export const healthCheckManager = new HealthCheckManager();

/**
 * Express-compatible health check endpoint
 */
export function createHealthEndpoint() {
  return async (_req: any, res: any) => {
    try {
      const health = await healthCheckManager.runHealthChecks();

      let statusCode: number;
      if (health.status === 'healthy' || health.status === 'degraded') {
        statusCode = 200;
      } else {
        statusCode = 503;
      }

      res.status(statusCode).json(health);
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Health check failed');
      res.status(503).json({
        status: 'critical',
        message: 'Health check system failure',
        timestamp: Date.now(),
      });
    }
  };
}

/**
 * Kubernetes-style readiness probe
 */
export function createReadinessEndpoint() {
  return async (_req: any, res: any) => {
    try {
      const isReady = await healthCheckManager.isReady();
      res.status(isReady ? 200 : 503).json({
        ready: isReady,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: (error as Error).message,
        timestamp: Date.now(),
      });
    }
  };
}

/**
 * Kubernetes-style liveness probe
 */
export function createLivenessEndpoint() {
  return async (_req: any, res: any) => {
    try {
      const isAlive = await healthCheckManager.isAlive();
      res.status(isAlive ? 200 : 503).json({
        alive: isAlive,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(503).json({
        alive: false,
        error: (error as Error).message,
        timestamp: Date.now(),
      });
    }
  };
}
