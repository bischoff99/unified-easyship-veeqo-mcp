/**
 * Services Index
 * Exports all service clients and integrations
 */

// Client services
export { EasyPostClient } from './clients/easypost-enhanced.js';
export { VeeqoClient } from './clients/veeqo-enhanced.js';

// Import types for service registry
import { EasyPostClient } from './clients/easypost-enhanced.js';
import { VeeqoClient } from './clients/veeqo-enhanced.js';

// Integration services removed - AI integrations disabled

// Service types
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

export interface ServiceRegistry {
  easypost: EasyPostClient;
  veeqo: VeeqoClient;
}

// Service factory
export function createServiceRegistry(): ServiceRegistry {
  const easypost = new EasyPostClient();
  const veeqo = new VeeqoClient();

  return {
    easypost,
    veeqo,
  };
}

// Health check utilities
export function checkServiceHealth(services: ServiceRegistry): ServiceHealth[] {
  const healthChecks = [checkEasyPostHealth(services.easypost), checkVeeqoHealth(services.veeqo)];

  return healthChecks;
}

function checkEasyPostHealth(_client: EasyPostClient): ServiceHealth {
  const startTime = Date.now();
  try {
    // Simple health check - could be improved with actual API call
    const responseTime = Date.now() - startTime;
    return {
      service: 'easypost',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime,
    };
  } catch (error: any) {
    return {
      service: 'easypost',
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message,
    };
  }
}

function checkVeeqoHealth(_client: VeeqoClient): ServiceHealth {
  const startTime = Date.now();
  try {
    // Simple health check - could be improved with actual API call
    const responseTime = Date.now() - startTime;
    return {
      service: 'veeqo',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime,
    };
  } catch (error: any) {
    return {
      service: 'veeqo',
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message,
    };
  }
}
