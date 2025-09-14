import { randomUUID } from 'node:crypto';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';

import type { JsonRpcRequest, JsonRpcResponse } from './types.js';
import { loadEnv } from '../utils/env.js';
import { ErrorCode, createError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

loadEnv();

const rl = createInterface({ input: stdin });

// Tool handlers map
const toolHandlers = new Map<string, (_params: any) => Promise<any>>([
  // EasyPost tools
  [
    'ep.verify_address',
    async (params) => {
      const { verifyAddress } = await import('./tools/verify-address.js');
      return verifyAddress(params);
    },
  ],
  [
    'ep.health',
    async () => {
      const { health } = await import('./tools/health.js');
      return health();
    },
  ],
  [
    'ep.parcel_presets',
    async () => {
      const { parcelPresets } = await import('./tools/parcel-presets.js');
      return parcelPresets();
    },
  ],
  [
    'ep.weight_to_oz',
    async (params) => {
      const { weightToOz } = await import('./tools/weight-to-oz.js');
      return weightToOz(params);
    },
  ],
  [
    'ep.optimize_shipping',
    async (params) => {
      const { optimizeShipping } = await import('./tools/optimize-shipping.js');
      return optimizeShipping(params);
    },
  ],
  [
    'ep.get_shipping_rates',
    async (params) => {
      const { EasyPostClient } = await import('../services/clients/easypost-enhanced.js');
      const client = new EasyPostClient();
      return client.getRates(params.to_address, params.from_address, params.parcel);
    },
  ],
  [
    'ep.track_shipment',
    async (params) => {
      const { EasyPostClient } = await import('../services/clients/easypost-enhanced.js');
      const client = new EasyPostClient();
      return client.trackShipment(params.tracking_code);
    },
  ],
  [
    'ep.create_shipment',
    async (params) => {
      const { EasyPostClient } = await import('../services/clients/easypost-enhanced.js');
      const client = new EasyPostClient();
      return client.createShipment(params.to_address, params.from_address, params.parcel, params.customs_info);
    },
  ],
]);

async function handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const requestId = randomUUID();
  const startTime = Date.now();

  try {
    if (request.method === 'initialize') {
      logger.info({ requestId, method: 'initialize' }, 'Initializing MCP server');
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '1.0',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'easypost-veeqo-mcp', version: '1.0.0' },
        },
      };
    }

    if (request.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: Array.from(toolHandlers.keys()).map((name) => ({
            name,
            description: getToolDescription(name),
            inputSchema: getSchema(name),
          })),
        },
      };
    }

    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;
      const handler = toolHandlers.get(name);
      if (!handler) {
        throw createError(ErrorCode.METHOD_NOT_FOUND, `Tool ${name} not found`);
      }
      logger.info({ requestId, tool: name }, 'Executing tool');
      const result = await handler(args);
      const duration = Date.now() - startTime;
      logger.info({ requestId, tool: name, duration }, 'Tool executed successfully');
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      };
    }

    throw createError(ErrorCode.METHOD_NOT_FOUND, `Method ${request.method} not found`);
  } catch (error: any) {
    logger.error({ requestId, error: error.message }, 'Request failed');
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: error.code || ErrorCode.INTERNAL_ERROR,
        message: error.message,
        data: error.details,
      },
    };
  }
}

function getToolDescription(name: string): string {
  const d: Record<string, string> = {
    'ep.verify_address': 'Verify and normalize an address',
    'ep.health': 'API health check',
    'ep.parcel_presets': 'Common parcel presets',
    'ep.weight_to_oz': 'Convert lb/oz to oz',
  };
  return d[name] || '';
}

function getSchema(toolName: string): any {
  const s: Record<string, any> = {
    'ep.verify_address': {
      type: 'object',
      properties: {
        street1: { type: 'string' },
        street2: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
        country: { type: 'string', default: 'US' },
      },
      required: ['street1', 'city', 'zip'],
    },
    'ep.health': {
      type: 'object',
      properties: {},
    },
    'ep.parcel_presets': {
      type: 'object',
      properties: {},
    },
    'ep.weight_to_oz': {
      type: 'object',
      properties: {
        pounds: { type: 'number', minimum: 0 },
        ounces: { type: 'number', minimum: 0 },
      },
    },
  };
  return s[toolName];
}

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line) as JsonRpcRequest;
    const response = await handleRequest(request);
    stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    logger.error({ error }, 'Failed to parse request');
  }
});

logger.info('Unified MCP server started');

// Default export for the MCP server
export default {
  start: () => {
    logger.info('MCP server is running');
  },
  stop: () => {
    rl.close();
    logger.info('MCP server stopped');
  },
};
