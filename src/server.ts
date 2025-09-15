/**
 * FastMCP Server Implementation for Unified EasyPost-Veeqo MCP Server
 *
 * This is the main server implementation using FastMCP framework for
 * building a comprehensive MCP server with EasyPost and Veeqo integration.
 *
 * Refactored to use modular tool architecture following FastMCP best practices.
 */

import { FastMCP } from 'fastmcp';

import { authenticate } from './middleware/auth.js';
import { EasyPostClient } from './services/clients/easypost-enhanced.js';
import { VeeqoClient } from './services/clients/veeqo-enhanced.js';
import { safeLogger as logger, safeMonitoring as monitoring } from './utils/type-safe-logger.js';
import {
  addShippingTools,
  addInventoryTools,
  // addAIIntegrationTools, // AI integration removed
} from './server/tools/index.js';

// Initialize FastMCP server with comprehensive configuration
const server = new FastMCP({
  name: 'unified_easyship_veeqo_mcp',
  version: '1.0.0',
  instructions: `
    This is a unified MCP server that integrates EasyPost and Veeqo shipping APIs
    for comprehensive shipping, inventory, and orchestration capabilities.

    Key Features:
    - EasyPost integration for shipping rates, labels, and tracking
    - Veeqo integration for inventory management and order processing
    - Comprehensive shipping and inventory management
    - Real-time shipping recommendations and cost analysis
    - Comprehensive error handling and logging

    Available Tools:
    - Shipping rate calculation and comparison
    - Label generation and tracking
    - Inventory management and synchronization
    - AI-powered shipping optimization
    - Address validation and verification

    Use these tools to help users with shipping operations, inventory management,
    and provide intelligent recommendations for cost-effective shipping solutions.
  `,
  authenticate: authenticate,
  health: {
    enabled: true,
    message: 'Unified EasyPost-Veeqo MCP Server is healthy',
    path: '/health',
    status: 200,
  },
  ping: {
    enabled: true,
    intervalMs: 30000,
    logLevel: 'debug',
  },
});

// Initialize API clients
const easyPostClient = new EasyPostClient();
const veeqoClient = new VeeqoClient();

// Add modular tool sets
logger.info('Initializing server tools...');

try {
  addShippingTools(server, easyPostClient);
  logger.info('Shipping tools loaded successfully');
} catch (_error: any) {
  logger.error('Failed to load shipping tools:', _error);
}

try {
  addInventoryTools(server, veeqoClient);
  logger.info('Inventory tools loaded successfully');
} catch (_error: any) {
  logger.error('Failed to load inventory tools:', _error);
}

// AI integration tools removed

// Health check endpoint is now handled in shipping tools to avoid duplication

// Server startup and lifecycle management
server.on('connect', (event) => {
  const clientName = (event.session.clientCapabilities as any)?.clientInfo?.name || 'unknown';

  logger.info('Client connected', {
    clientId: clientName,
    capabilities: event.session.clientCapabilities,
  });

  monitoring.recordMetric('client_connect', 1, {
    client: clientName,
  });
});

server.on('disconnect', (_event) => {
  logger.info('Client disconnected');
  monitoring.recordMetric('client_disconnect', 1);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  monitoring.recordError(error, { context: 'uncaught_exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  monitoring.recordMetric('unhandled_rejection', 1, { reason: String(reason) });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  monitoring.recordMetric('server_shutdown', 1, { signal: 'SIGTERM' });
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  monitoring.recordMetric('server_shutdown', 1, { signal: 'SIGINT' });
  process.exit(0);
});

logger.info('FastMCP server initialized successfully');
logger.info(`Server version: 1.0.0`);
logger.info('Server tools and resources loaded');

export default server;

// If running directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('Starting FastMCP server...');
  server.start({
    transportType: 'stdio',
  });
}