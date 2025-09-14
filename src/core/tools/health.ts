/**
 * Enhanced Health Check Tool with Monitoring Integration
 */

import { monitoring } from '../../utils/monitoring.js';
import { logger } from '../../utils/logger.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  services: {
    easypost: {
      status: 'connected' | 'error' | 'mock';
      latency?: number;
      lastCheck: number;
    };
    veeqo: {
      status: 'connected' | 'error' | 'mock';
      latency?: number;
      lastCheck: number;
    };
    monitoring: {
      status: 'enabled' | 'disabled';
      metricsCollected: number;
      alertsActive: number;
    };
  };
  system: {
    memory: {
      used: number;
      free: number;
      percentage: number;
    };
    performance: {
      totalRequests: number;
      errorRate: number;
      averageResponseTime: number;
    };
  };
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
      timestamp: number;
    };
  };
}

export async function health() {
  const start = Date.now();
  try {
    const healthStatus = await getHealthStatus();
    const latency = Date.now() - start;

    return {
      ...healthStatus,
      latency_ms: latency,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get comprehensive health status
 */
export async function getHealthStatus(): Promise<HealthCheckResult> {
  try {
    // Get health status from monitoring system
    const healthStatus = await monitoring.getHealthStatus();
    const systemMetrics = monitoring.getSystemMetrics();

    // Check API service status
    const easypostStatus = checkApiService('easypost');
    const veeqoStatus = checkApiService('veeqo');

    // Get monitoring stats
    const monitoringEnabled = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';

    return {
      status: healthStatus.status,
      timestamp: Date.now(),
      uptime: healthStatus.uptime,
      version: healthStatus.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        easypost: easypostStatus,
        veeqo: veeqoStatus,
        monitoring: {
          status: monitoringEnabled ? 'enabled' : 'disabled',
          metricsCollected: 0, // TODO: Get actual count from monitoring
          alertsActive: 0 // TODO: Get active alerts count
        }
      },
      system: {
        memory: systemMetrics.memory,
        performance: {
          totalRequests: systemMetrics.api.totalRequests,
          errorRate: systemMetrics.api.errorRate,
          averageResponseTime: systemMetrics.api.averageResponseTime
        }
      },
      checks: healthStatus.checks
    };

  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Health check failed');

    return {
      status: 'unhealthy',
      timestamp: Date.now(),
      uptime: process.uptime() * 1000,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        easypost: { status: 'error', lastCheck: Date.now() },
        veeqo: { status: 'error', lastCheck: Date.now() },
        monitoring: { status: 'disabled', metricsCollected: 0, alertsActive: 0 }
      },
      system: {
        memory: { used: 0, free: 0, percentage: 0 },
        performance: { totalRequests: 0, errorRate: 100, averageResponseTime: 0 }
      },
      checks: {
        'health-system': {
          status: 'fail',
          message: (error as Error).message,
          timestamp: Date.now()
        }
      }
    };
  }
}

/**
 * Check API service status
 */
function checkApiService(service: 'easypost' | 'veeqo'): HealthCheckResult['services']['easypost'] {
  const apiKey = service === 'easypost'
    ? process.env.EASYPOST_API_KEY
    : process.env.VEEQO_API_KEY;

  if (!apiKey || apiKey === 'mock') {
    return {
      status: 'mock',
      lastCheck: Date.now()
    };
  }

  // TODO: Implement actual API connectivity check
  // For now, assume connected if API key is provided
  return {
    status: 'connected',
    latency: 0,
    lastCheck: Date.now()
  };
}
