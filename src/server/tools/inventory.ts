/**
 * Inventory Tools Module for FastMCP Server
 * Contains all Veeqo inventory-related tools and functionality
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { VeeqoClient } from '../../services/clients/veeqo-enhanced.js';
import { safeLogger as logger, safeMonitoring as monitoring } from '../../utils/type-safe-logger.js';

const logError = (message: string, error: any) => {
  logger.error(message, error);
};

export function addInventoryTools(server: FastMCP, veeqoClient: VeeqoClient) {
  /**
   * Get products from Veeqo
   */
  server.addTool({
    name: 'get_products',
    description: 'Retrieve products from Veeqo inventory',
    parameters: z.object({
      page: z.number().min(1).default(1).describe('Page number for pagination'),
      per_page: z.number().min(1).max(100).default(25).describe('Number of products per page'),
      query: z.string().optional().describe('Search query to filter products'),
      sku: z.string().optional().describe('Filter by specific SKU'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Fetching products from Veeqo', {
          page: args.page,
          per_page: args.per_page,
          query: args.query,
          sku: args.sku,
        });

        const products = await veeqoClient.getProducts(args.per_page, args.page);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/products', duration, 200, true);

        logger.info(`Retrieved ${products.length} products in ${duration}ms`);
        const result = {
          products,
          count: products.length,
          page: args.page,
          per_page: args.per_page,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/products', duration, 500, true);
        logError('Failed to fetch products', error);
        throw new Error(`Product retrieval failed: ${error.message}`);
      }
    },
  });

  /**
   * Get orders from Veeqo
   */
  server.addTool({
    name: 'get_orders',
    description: 'Retrieve orders from Veeqo',
    parameters: z.object({
      page: z.number().min(1).default(1).describe('Page number for pagination'),
      per_page: z.number().min(1).max(100).default(25).describe('Number of orders per page'),
      status: z.enum(['awaiting_fulfillment', 'fulfilled', 'cancelled', 'all']).default('all').describe('Filter by order status'),
      since: z.string().optional().describe('ISO date string to filter orders since a specific date'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Fetching orders from Veeqo', {
          page: args.page,
          per_page: args.per_page,
          status: args.status,
          since: args.since,
        });

        const orders = await veeqoClient.getOrders(
          args.per_page,
          args.page,
          args.status === 'all' ? undefined : args.status
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/orders', duration, 200, true);

        logger.info(`Retrieved ${orders.length} orders in ${duration}ms`);
        const result = {
          orders,
          count: orders.length,
          page: args.page,
          per_page: args.per_page,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/orders', duration, 500, true);
        logError('Failed to fetch orders', error);
        throw new Error(`Order retrieval failed: ${error.message}`);
      }
    },
  });

  /**
   * Create fulfillment in Veeqo
   */
  server.addTool({
    name: 'create_fulfillment',
    description: 'Create a fulfillment for an order in Veeqo',
    parameters: z.object({
      order_id: z.number().describe('Veeqo order ID'),
      line_items: z.array(z.object({
        sellable_id: z.number().describe('Product variant ID'),
        quantity: z.number().min(1).describe('Quantity to fulfill'),
      })).describe('Array of line items to fulfill'),
      tracking_number: z.string().optional().describe('Shipping tracking number'),
      carrier: z.string().optional().describe('Shipping carrier name'),
      service: z.string().optional().describe('Shipping service type'),
      notify_customer: z.boolean().default(true).describe('Send notification email to customer'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Creating fulfillment in Veeqo', {
          order_id: args.order_id,
          line_items: args.line_items.length,
          tracking_number: args.tracking_number,
        });

        const fulfillment = await veeqoClient.createFulfillment({
          order_id: args.order_id,
          line_items: args.line_items,
          tracking_number: args.tracking_number,
          carrier: args.carrier,
          service: args.service,
          notify_customer: args.notify_customer,
        });

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/fulfillments', duration, 200, true);

        logger.info(`Created fulfillment ${fulfillment.id} in ${duration}ms`);
        const result = {
          ...fulfillment,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/fulfillments', duration, 500, true);
        logError('Failed to create fulfillment', error);
        throw new Error(`Fulfillment creation failed: ${error.message}`);
      }
    },
  });

  /**
   * Update inventory levels
   */
  server.addTool({
    name: 'update_inventory',
    description: 'Update inventory levels for a product variant in Veeqo',
    parameters: z.object({
      sellable_id: z.number().describe('Product variant ID'),
      warehouse_id: z.number().describe('Warehouse ID'),
      available_count: z.number().min(0).describe('New available inventory count'),
      note: z.string().optional().describe('Optional note for the inventory update'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Updating inventory in Veeqo', {
          sellable_id: args.sellable_id,
          warehouse_id: args.warehouse_id,
          available_count: args.available_count,
        });

        const result = await veeqoClient.updateInventory({
          sellable_id: args.sellable_id,
          warehouse_id: args.warehouse_id,
          available_count: args.available_count,
          note: args.note,
        });

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/inventory', duration, 200, true);

        logger.info(`Updated inventory for sellable ${args.sellable_id} in ${duration}ms`);
        const finalResult = {
          ...result,
          processing_time_ms: duration,
        };
        return JSON.stringify(finalResult, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/inventory', duration, 500, true);
        logError('Failed to update inventory', error);
        throw new Error(`Inventory update failed: ${error.message}`);
      }
    },
  });

  /**
   * Get warehouses
   */
  server.addTool({
    name: 'get_warehouses',
    description: 'Retrieve list of warehouses from Veeqo',
    parameters: z.object({}),
    execute: async (_args) => {
      const startTime = Date.now();
      try {
        logger.info('Fetching warehouses from Veeqo');

        const warehouses = await veeqoClient.getWarehouses();

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/warehouses', duration, 200, true);

        logger.info(`Retrieved ${warehouses.length} warehouses in ${duration}ms`);
        const result = {
          warehouses,
          count: warehouses.length,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/warehouses', duration, 500, true);
        logError('Failed to fetch warehouses', error);
        throw new Error(`Warehouse retrieval failed: ${error.message}`);
      }
    },
  });

  /**
   * Get inventory levels for a product
   */
  server.addTool({
    name: 'get_inventory_levels',
    description: 'Get current inventory levels for a product across all warehouses',
    parameters: z.object({
      product_id: z.number().optional().describe('Product ID'),
      sellable_id: z.number().optional().describe('Product variant (sellable) ID'),
      sku: z.string().optional().describe('Product SKU'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        if (!args.product_id && !args.sellable_id && !args.sku) {
          throw new Error('Must provide either product_id, sellable_id, or sku');
        }

        logger.info('Fetching inventory levels from Veeqo', {
          product_id: args.product_id,
          sellable_id: args.sellable_id,
          sku: args.sku,
        });

        const productIds = args.product_id ? [args.product_id.toString()] : undefined;
        const inventoryLevels = await veeqoClient.getInventoryLevels(productIds);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/inventory_levels', duration, 200, true);

        logger.info(`Retrieved inventory levels in ${duration}ms`);
        const result = {
          inventory_levels: inventoryLevels,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('veeqo', '/inventory_levels', duration, 500, true);
        logError('Failed to fetch inventory levels', error);
        throw new Error(`Inventory levels retrieval failed: ${error.message}`);
      }
    },
  });
}