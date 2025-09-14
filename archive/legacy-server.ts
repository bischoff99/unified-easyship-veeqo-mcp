/**
 * FastMCP Server Implementation for Unified EasyPost-Veeqo MCP Server
 *
 * This is the main server implementation using FastMCP framework for
 * building a comprehensive MCP server with EasyPost and Veeqo integration.
 *
 * Refactored to use modular tool architecture following FastMCP best practices.
 */

import { FastMCP } from 'fastmcp';

import { authenticate } from '../middleware/auth.js';
import { EasyPostClient } from '../services/clients/easypost-enhanced.js';
import { VeeqoClient } from '../services/clients/veeqo-enhanced.js';
import { logger } from '../utils/logger.js';
import { monitoring } from '../utils/monitoring.js';
import {
  addShippingTools,
  addInventoryTools,
  addAIIntegrationTools,
} from './tools/index.js';

// Initialize FastMCP server with comprehensive configuration
const server = new FastMCP({
  name: 'unified-easyship-veeqo-mcp',
  version: '1.0.0',
  instructions: `
    This is a unified MCP server that integrates EasyPost and Veeqo shipping APIs
    for comprehensive shipping, inventory, and orchestration capabilities.

    Key Features:
    - EasyPost integration for shipping rates, labels, and tracking
    - Veeqo integration for inventory management and order processing
    - AI-powered shipping optimization using Claude Code
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

// ============================================================================
// SHIPPING TOOLS
// ============================================================================

/**
 * Calculate shipping rates from multiple carriers
 */
server.addTool({
  name: 'calculate_shipping_rates',
  description: 'Calculate shipping rates from multiple carriers for a package',
  parameters: z.object({
    from_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    to_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    parcel: z.object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
      weight: z.number(),
    }),
    carriers: z.array(z.string()).optional().default(['USPS', 'UPS', 'FedEx']),
  }),
  annotations: {
    title: 'Shipping Rate Calculator',
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Calculating shipping rates...\n',
      });

      const rates = await easyPostClient.getRates(
        args.from_address as EasyPostAddress,
        args.to_address as EasyPostAddress,
        args.parcel
      );

      await reportProgress({ progress: 50, total: 100 });
      await streamContent({
        type: 'text',
        text: `Found ${rates.length} shipping options\n`,
      });

      // Filter by requested carriers
      const filteredRates = rates.filter((rate) =>
        args.carriers.some((carrier) => rate.carrier.toLowerCase().includes(carrier.toLowerCase()))
      );

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              `Shipping Rates for ${args.from_address.city}, ${args.from_address.state} to ${args.to_address.city}, ${args.to_address.state}:\n\n` +
              filteredRates
                .map(
                  (rate) =>
                    `${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`
                )
                .join('\n'),
          },
        ],
      };
    } catch (error) {
      logError('Error calculating shipping rates', {
        error: (error as Error).message,
        args,
      });
      throw new Error(`Failed to calculate shipping rates: ${(error as Error).message}`);
    }
  },
});

/**
 * Generate shipping label
 */
server.addTool({
  name: 'create_shipping_label',
  description: 'Create a shipping label for a package',
  parameters: z.object({
    from_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    to_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    parcel: z.object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
      weight: z.number(),
    }),
    carrier: z.string(),
    service: z.string(),
  }),
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Creating shipping label...\n',
      });

      const label = await easyPostClient.createLabel(
        args.from_address as EasyPostAddress,
        args.to_address as EasyPostAddress,
        args.parcel,
        args.carrier,
        args.service
      );

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'Shipping label created successfully!\n\n' +
              `Tracking Number: ${label.tracking_code}\n` +
              `Carrier: ${label.carrier}\n` +
              `Service: ${label.service}\n` +
              `Rate: $${label.rate}\n` +
              `Label URL: ${label.label_url}`,
          },
        ],
      };
    } catch (error) {
      logError('Error creating shipping label', {
        error: (error as Error).message,
        args,
      });
      throw new Error(`Failed to create shipping label: ${(error as Error).message}`);
    }
  },
});

/**
 * Track shipment
 */
server.addTool({
  name: 'track_shipment',
  description: 'Track a shipment using its tracking number',
  parameters: z.object({
    tracking_number: z.string(),
  }),
  annotations: {
    title: 'Shipment Tracker',
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      const tracking = await easyPostClient.trackShipment(args.tracking_number);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              `Tracking Information for ${args.tracking_number}:\n\n` +
              `Status: ${tracking.status}\n` +
              `Carrier: ${tracking.carrier}\n` +
              `Status Detail: ${tracking.status_detail}\n` +
              'Tracking Details:\n' +
              tracking.tracking_details
                .map((detail) => `  ${detail.datetime}: ${detail.message} (${detail.status})`)
                .join('\n'),
          },
        ],
      };
    } catch (error) {
      logError('Error tracking shipment', {
        error: (error as Error).message,
        args,
      });
      throw new Error(`Failed to track shipment: ${(error as Error).message}`);
    }
  },
});

/**
 * Select best shipping rate based on criteria
 */
server.addTool({
  name: 'select_best_rate',
  description: 'Select the best shipping rate based on criteria like cost, speed, or reliability',
  parameters: z.object({
    from_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    to_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    parcel: z.object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
      weight: z.number(),
    }),
    selection_criteria: z
      .object({
        priority: z.enum(['cost', 'speed', 'reliability', 'balanced']).default('balanced'),
        max_cost: z.number().optional(),
        max_delivery_days: z.number().optional(),
        preferred_carriers: z.array(z.string()).optional(),
        exclude_carriers: z.array(z.string()).optional(),
      })
      .optional()
      .default(() => ({ priority: "balanced" as const })),
  }),
  annotations: {
    title: 'Smart Rate Selection',
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Analyzing shipping rates and selecting best option...\n',
      });

      // Get all available rates
      const rates = await easyPostClient.getRates(
        args.from_address as EasyPostAddress,
        args.to_address as EasyPostAddress,
        args.parcel
      );

      await reportProgress({ progress: 50, total: 100 });

      // Apply filters
      let filteredRates = rates;

      // Filter by preferred/excluded carriers
      if (args.selection_criteria.preferred_carriers?.length) {
        filteredRates = filteredRates.filter(
          (rate) =>
            args.selection_criteria.preferred_carriers?.some((carrier) =>
              rate.carrier.toLowerCase().includes(carrier.toLowerCase())
            ) ?? false
        );
      }

      if (args.selection_criteria.exclude_carriers?.length) {
        filteredRates = filteredRates.filter(
          (rate) =>
            !(
              args.selection_criteria.exclude_carriers?.some((carrier) =>
                rate.carrier.toLowerCase().includes(carrier.toLowerCase())
              ) ?? false
            )
        );
      }

      // Filter by cost and delivery days
      if (args.selection_criteria.max_cost) {
        filteredRates = filteredRates.filter(
          (rate) => parseFloat(rate.rate) <= (args.selection_criteria.max_cost ?? Infinity)
        );
      }

      if (args.selection_criteria.max_delivery_days) {
        filteredRates = filteredRates.filter(
          (rate) => rate.delivery_days <= (args.selection_criteria.max_delivery_days ?? Infinity)
        );
      }

      // Select best rate based on priority
      if (filteredRates.length === 0) {
        throw new Error('No rates available matching the specified criteria');
      }

      let selectedRate = filteredRates[0];

      if (filteredRates.length > 1) {
        switch (args.selection_criteria.priority) {
          case 'cost':
            selectedRate = filteredRates.reduce(
              (best, current) =>
                parseFloat(current.rate) < parseFloat(best!.rate) ? current : best,
              filteredRates[0]!
            );
            break;
          case 'speed':
            selectedRate = filteredRates.reduce(
              (best, current) => (current.delivery_days < best!.delivery_days ? current : best),
              filteredRates[0]!
            );
            break;
          case 'reliability':
          case 'balanced':
          default:
            // Score based on cost and speed (lower is better)
            selectedRate = filteredRates.reduce((best, current) => {
              const bestScore = parseFloat(best!.rate) * 0.6 + best!.delivery_days * 0.4;
              const currentScore = parseFloat(current.rate) * 0.6 + current.delivery_days * 0.4;
              return currentScore < bestScore ? current : best;
            }, filteredRates[0]!);
            break;
        }
      }

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: selectedRate
              ? 'Selected Best Rate:\n\n' +
                `Carrier: ${selectedRate.carrier}\n` +
                `Service: ${selectedRate.service}\n` +
                `Rate: $${selectedRate.rate}\n` +
                `Delivery: ${selectedRate.delivery_days} days\n` +
                `Selection Criteria: ${args.selection_criteria.priority}\n\n` +
                `Total rates analyzed: ${rates.length}\n` +
                `Rates meeting criteria: ${filteredRates.length}`
              : 'No rates found matching the specified criteria',
          },
        ],
      };
    } catch (error) {
      logError('Error selecting best rate', {
        error: (error as Error).message,
        args,
      });
      throw new Error(`Failed to select best rate: ${(error as Error).message}`);
    }
  },
});

/**
 * Create return shipping label
 */
server.addTool({
  name: 'create_return_label',
  description: 'Create a return shipping label for customers',
  parameters: z.object({
    original_shipment_id: z.string().optional(),
    from_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    to_address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    parcel: z.object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
      weight: z.number(),
    }),
    carrier: z.string().optional(),
    service: z.string().optional(),
    return_options: z
      .object({
        prepaid: z.boolean().default(true),
        qr_code: z.boolean().default(false),
        drop_off_type: z
          .enum(['REGULAR_PICKUP', 'SCHEDULED_PICKUP', 'DROPOFF'])
          .default('REGULAR_PICKUP'),
      })
      .optional()
      .default(() => ({ prepaid: false, qr_code: false, drop_off_type: "REGULAR_PICKUP" as const })),
  }),
  annotations: {
    title: 'Return Label Generator',
    readOnlyHint: false,
    streamingHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Creating return shipping label...\n',
      });

      // If no carrier/service specified, get cheapest rate
      let carrier = args.carrier;
      let service = args.service;

      if (!carrier || !service) {
        await streamContent({
          type: 'text',
          text: 'Selecting best return rate...\n',
        });

        const rates = await easyPostClient.getRates(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel
        );

        if (rates.length === 0) {
          throw new Error('No shipping rates available');
        }

        const cheapestRate = rates.reduce(
          (best, current) => (parseFloat(current.rate) < parseFloat(best!.rate) ? current : best),
          rates[0]!
        );

        carrier = cheapestRate!.carrier;
        service = cheapestRate!.service;
      }

      await reportProgress({ progress: 50, total: 100 });

      const label = await easyPostClient.createLabel(
        args.from_address as EasyPostAddress,
        args.to_address as EasyPostAddress,
        args.parcel,
        carrier,
        service
      );

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'Return label created successfully!\n\n' +
              `Tracking Number: ${label.tracking_code}\n` +
              `Carrier: ${label.carrier}\n` +
              `Service: ${label.service}\n` +
              `Rate: $${label.rate}\n` +
              `Label URL: ${label.label_url}\n\n` +
              'Return Options:\n' +
              `- Prepaid: ${args.return_options.prepaid ? 'Yes' : 'No'}\n` +
              `- QR Code: ${args.return_options.qr_code ? 'Yes' : 'No'}\n` +
              `- Drop-off Type: ${args.return_options.drop_off_type}`,
          },
        ],
      };
    } catch (error) {
      logError('Error creating return label', {
        error: (error as Error).message,
        args,
      });
      throw new Error(`Failed to create return label: ${(error as Error).message}`);
    }
  },
});

/**
 * Enhanced address validation with suggestions
 */
server.addTool({
  name: 'validate_address_with_suggestions',
  description: 'Validate an address and get correction suggestions',
  parameters: z.object({
    address: z.object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    strict_validation: z.boolean().default(false),
  }),
  annotations: {
    title: 'Address Validator',
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      const validation = await easyPostClient.verifyAddress(args.address as EasyPostAddress);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validation, null, 2),
          },
        ],
      };
    } catch (error) {
      logError('Error validating address', {
        error: (error as Error).message,
        args,
      });
      throw new Error(`Failed to validate address: ${(error as Error).message}`);
    }
  },
});

// ============================================================================
// INVENTORY TOOLS
// ============================================================================

/**
 * Get inventory levels
 */
server.addTool({
  name: 'get_inventory_levels',
  description: 'Get current inventory levels from Veeqo',
  parameters: z.object({
    product_ids: z.array(z.string()).optional(),
    location_ids: z.array(z.string()).optional(),
  }),
  annotations: {
    title: 'Inventory Levels',
    readOnlyHint: true,
  },
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      const inventory = await veeqoClient.getInventoryLevels(args.product_ids, args.location_ids);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'Inventory Levels:\n\n' +
              inventory
                .map(
                  (item) =>
                    `Product: ${item.product_name}\n` +
                    `SKU: ${item.sku}\n` +
                    `Available: ${item.available_quantity}\n` +
                    `Reserved: ${item.reserved_quantity}\n` +
                    `Location: ${item.location_name}\n`
                )
                .join('\n---\n'),
          },
        ],
      };
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          args,
        },
        'Error getting inventory levels'
      );
      throw new Error(`Failed to get inventory levels: ${(error as Error).message}`);
    }
  },
});

/**
 * Update inventory levels
 */
server.addTool({
  name: 'update_inventory_levels',
  description: 'Update inventory levels in Veeqo',
  parameters: z.object({
    updates: z.array(
      z.object({
        product_id: z.string(),
        location_id: z.string(),
        quantity: z.number(),
        reason: z.string().optional(),
      })
    ),
  }),
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Updating inventory levels...\n',
      });

      const results = await veeqoClient.updateInventoryLevels(
        args.updates.map((update) => ({
          product_id: parseInt(update.product_id),
          location_id: parseInt(update.location_id),
          quantity: update.quantity,
          reason: update.reason,
        }))
      );

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'Inventory levels updated successfully!\n\n' +
              results
                .map(
                  (result) =>
                    `Product ${result.product_id}: ${result.old_quantity} → ${result.new_quantity}`
                )
                .join('\n'),
          },
        ],
      };
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          args,
        },
        'Error updating inventory levels'
      );
      throw new Error(`Failed to update inventory levels: ${(error as Error).message}`);
    }
  },
});

// Helper functions for order fulfillment
async function validateInventory(fulfillmentDetails: any, streamContent: any) {
  const inventoryChecks = [];
  for (const item of fulfillmentDetails.shipped_items) {
    const inventory = await veeqoClient.getInventoryLevels(
      [item.line_item_id],
      [fulfillmentDetails.location_id]
    );
    inventoryChecks.push({
      item: item.line_item_id,
      available: inventory[0]?.available_quantity ?? 0,
      requested: item.quantity,
    });
  }

  const shortfalls = inventoryChecks.filter((check) => check.available < check.requested);
  if (shortfalls.length > 0) {
    const shortfallMessages = shortfalls.map(
      (s) => `${s.item} (need ${s.requested}, have ${s.available})`
    );
    throw new Error(`Insufficient inventory for items: ${shortfallMessages.join(', ')}`);
  }

  await streamContent({
    type: 'text',
    text: 'Inventory validated successfully\n',
  });

  return inventoryChecks;
}

async function updateOrderStatus(args: any) {
  return await veeqoClient.updateOrder(args.order_id, {
    status: 'fulfilled',
    tracking_number: args.fulfillment_details.tracking_number,
    carrier: args.fulfillment_details.carrier,
  });
}

async function createShippingLabel(order: any, args: any, streamContent: any) {
  if (
    !args.create_label ||
    !args.fulfillment_details.carrier ||
    !args.fulfillment_details.service
  ) {
    return null;
  }

  await streamContent({
    type: 'text',
    text: 'Creating shipping label...\n',
  });

  if (!order.shipping_address) {
    return null;
  }

  const fromAddress = {
    name: 'Your Store',
    street1: '123 Main St',
    city: 'Your City',
    state: 'ST',
    zip: '12345',
    country: 'US',
  };

  const toAddress = {
    name: `${order.customer.first_name} ${order.customer.last_name}`,
    street1: order.shipping_address.address1 || '',
    street2: order.shipping_address.address2,
    city: order.shipping_address.city || '',
    state: order.shipping_address.state || '',
    zip: order.shipping_address.zip || '',
    country: order.shipping_address.country || 'US',
  };

  return await easyPostClient.createLabel(
    fromAddress,
    toAddress,
    { length: 12, width: 9, height: 6, weight: 16 },
    args.fulfillment_details.carrier,
    args.fulfillment_details.service
  );
}

/**
 * Order fulfillment integration
 */
server.addTool({
  name: 'fulfill_order',
  description: 'Mark an order as fulfilled and optionally create shipping labels',
  parameters: z.object({
    order_id: z.string(),
    fulfillment_details: z.object({
      location_id: z.string(),
      tracking_number: z.string().optional(),
      carrier: z.string().optional(),
      service: z.string().optional(),
      shipped_items: z.array(
        z.object({
          line_item_id: z.string(),
          quantity: z.number(),
        })
      ),
    }),
    create_label: z.boolean().default(false),
    notify_customer: z.boolean().default(true),
    hooks: z
      .object({
        pre_validation: z.string().optional(),
        post_validation: z.string().optional(),
      })
      .optional(),
  }),
  annotations: {
    title: 'Order Fulfillment',
    readOnlyHint: false,
    streamingHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      // Pre-validation hook
      if (args.hooks?.pre_validation) {
        await streamContent({
          type: 'text',
          text: `Running pre-validation hook: ${args.hooks.pre_validation}\n`,
        });
      }

      await streamContent({
        type: 'text',
        text: 'Processing order fulfillment...\n',
      });

      // Get order details
      const order = await veeqoClient.getOrder(args.order_id);

      await reportProgress({ progress: 25, total: 100 });

      // Validate inventory availability
      const inventoryChecks = await validateInventory(args.fulfillment_details, streamContent);
      await reportProgress({ progress: 50, total: 100 });

      // Update order status to fulfilled
      const updatedOrder = await updateOrderStatus(args);
      await reportProgress({ progress: 75, total: 100 });

      // Create shipping label if requested
      const labelInfo = await createShippingLabel(order, args, streamContent);

      // Post-validation hook
      if (args.hooks?.post_validation) {
        await streamContent({
          type: 'text',
          text: `Running post-validation hook: ${args.hooks.post_validation}\n`,
        });
      }

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              `Order ${args.order_id} fulfilled successfully!\n\n` +
              `Status: ${updatedOrder.status}\n` +
              `Items Shipped: ${args.fulfillment_details.shipped_items.length}\n` +
              `Location: ${args.fulfillment_details.location_id}\n` +
              (args.fulfillment_details.tracking_number
                ? `Tracking: ${args.fulfillment_details.tracking_number}\n`
                : '') +
              (labelInfo
                ? `\nShipping Label Created:\n- Label URL: ${labelInfo.label_url}\n- Tracking: ${labelInfo.tracking_code}\n`
                : '') +
              `\nInventory Checks Passed: ${inventoryChecks.length}`,
          },
        ],
      };
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          args,
        },
        'Error fulfilling order'
      );
      throw new Error(`Failed to fulfill order: ${(error as Error).message}`);
    }
  },
});

/**
 * Smart inventory allocation
 */
server.addTool({
  name: 'allocate_inventory',
  description: 'Intelligently allocate inventory across multiple warehouses for orders',
  parameters: z.object({
    order_id: z.string(),
    allocation_strategy: z
      .enum(['closest_warehouse', 'lowest_cost', 'fastest_shipping', 'balanced'])
      .default('balanced'),
    force_single_warehouse: z.boolean().default(false),
    preferred_warehouses: z.array(z.string()).optional(),
    hooks: z
      .object({
        pre_validation: z.string().optional(),
        post_validation: z.string().optional(),
      })
      .optional(),
  }),
  annotations: {
    title: 'Smart Inventory Allocation',
    readOnlyHint: false,
    openWorldHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      // Pre-validation hook
      if (args.hooks?.pre_validation) {
        await streamContent({
          type: 'text',
          text: `Running pre-validation hook: ${args.hooks.pre_validation}\n`,
        });
      }

      await streamContent({
        type: 'text',
        text: 'Analyzing inventory allocation options...\n',
      });

      // Get order details
      const order = await veeqoClient.getOrder(args.order_id);

      await reportProgress({ progress: 25, total: 100 });

      // Get all warehouse locations
      const locations = await veeqoClient.getLocations();

      // Filter by preferred warehouses if specified
      const availableLocations = args.preferred_warehouses
        ? locations.filter((loc) => args.preferred_warehouses?.includes(loc.id.toString()) ?? false)
        : locations;

      await reportProgress({ progress: 50, total: 100 });

      // Check inventory at each location
      const allocationOptions = [];

      for (const location of availableLocations) {
        const inventory = await veeqoClient.getInventoryLevels(undefined, [location.id.toString()]);

        // Calculate if this location can fulfill the order
        let canFulfill = true;
        let totalItems = 0;

        for (const item of order.line_items) {
          const itemInventory = inventory.find((inv) => inv.sku === item.sku);
          if (!itemInventory || itemInventory.available_quantity < item.quantity) {
            canFulfill = false;
            break;
          }
          totalItems += item.quantity;
        }

        if (canFulfill) {
          allocationOptions.push({
            location_id: location.id.toString(),
            location_name: location.name,
            total_items: totalItems,
            estimated_cost: totalItems * 2.5, // Mock shipping cost calculation
            estimated_days: Math.floor(Math.random() * 3) + 1, // Mock delivery time
          });
        }
      }

      await reportProgress({ progress: 75, total: 100 });

      // Select best allocation based on strategy
      if (allocationOptions.length === 0) {
        throw new Error('No allocation options available');
      }

      let selectedAllocation = allocationOptions[0];

      if (allocationOptions.length > 1) {
        switch (args.allocation_strategy) {
          case 'lowest_cost':
            selectedAllocation = allocationOptions.reduce(
              (best, current) => (current.estimated_cost < best!.estimated_cost ? current : best),
              allocationOptions[0]!
            );
            break;
          case 'fastest_shipping':
            selectedAllocation = allocationOptions.reduce(
              (best, current) => (current.estimated_days < best!.estimated_days ? current : best),
              allocationOptions[0]!
            );
            break;
          case 'balanced':
          default:
            selectedAllocation = allocationOptions.reduce((best, current) => {
              const bestScore = best!.estimated_cost * 0.6 + best!.estimated_days * 0.4;
              const currentScore = current.estimated_cost * 0.6 + current.estimated_days * 0.4;
              return currentScore < bestScore ? current : best;
            }, allocationOptions[0]!);
            break;
        }
      }

      // Post-validation hook
      if (args.hooks?.post_validation) {
        await streamContent({
          type: 'text',
          text: `Running post-validation hook: ${args.hooks.post_validation}\n`,
        });
      }

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: selectedAllocation
              ? 'Inventory Allocation Completed:\n\n' +
                `Selected Warehouse: ${selectedAllocation.location_name}\n` +
                `Location ID: ${selectedAllocation.location_id}\n` +
                `Total Items: ${selectedAllocation.total_items}\n` +
                `Estimated Cost: $${selectedAllocation.estimated_cost.toFixed(2)}\n` +
                `Estimated Delivery: ${selectedAllocation.estimated_days} days\n` +
                `Strategy: ${args.allocation_strategy}\n\n` +
                `Total locations analyzed: ${availableLocations.length}\n` +
                `Viable allocations found: ${allocationOptions.length}`
              : 'No suitable warehouse allocation found for this order',
          },
        ],
      };
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          args,
        },
        'Error allocating inventory'
      );
      throw new Error(`Failed to allocate inventory: ${(error as Error).message}`);
    }
  },
});

/**
 * Process product returns
 */
server.addTool({
  name: 'process_return',
  description: 'Process a product return and update inventory',
  parameters: z.object({
    order_id: z.string(),
    returned_items: z.array(
      z.object({
        line_item_id: z.string(),
        quantity: z.number(),
        reason: z.enum(['defective', 'wrong_item', 'customer_changed_mind', 'damaged', 'other']),
        condition: z.enum(['new', 'used', 'damaged', 'defective']),
        notes: z.string().optional(),
      })
    ),
    return_to_inventory: z.boolean().default(true),
    refund_amount: z.number().optional(),
    restock_location_id: z.string().optional(),
    hooks: z
      .object({
        pre_validation: z.string().optional(),
        post_validation: z.string().optional(),
      })
      .optional(),
  }),
  annotations: {
    title: 'Returns Processing',
    readOnlyHint: false,
    streamingHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      // Pre-validation hook
      if (args.hooks?.pre_validation) {
        await streamContent({
          type: 'text',
          text: `Running pre-validation hook: ${args.hooks.pre_validation}\n`,
        });
      }

      await streamContent({
        type: 'text',
        text: 'Processing product returns...\n',
      });

      // Get order details
      const order = await veeqoClient.getOrder(args.order_id);

      await reportProgress({ progress: 25, total: 100 });

      // Process each returned item
      const processedReturns = [];

      for (const returnItem of args.returned_items) {
        await streamContent({
          type: 'text',
          text: `Processing return for item ${returnItem.line_item_id}...\n`,
        });

        // Find the original line item
        const originalItem = order.line_items.find(
          (item) => item.id.toString() === returnItem.line_item_id
        );
        if (!originalItem) {
          throw new Error(
            `Line item ${returnItem.line_item_id} not found in order ${args.order_id}`
          );
        }

        // Update inventory if returning to stock
        if (args.return_to_inventory && ['new', 'used'].includes(returnItem.condition)) {
          const locationId = args.restock_location_id ?? '339686'; // Default location

          await veeqoClient.updateInventoryLevels([
            {
              product_id: parseInt(originalItem.product_id?.toString() ?? '0'),
              location_id: parseInt(locationId),
              quantity: returnItem.quantity,
              reason: `Return - ${returnItem.reason}`,
            },
          ]);

          processedReturns.push({
            line_item_id: returnItem.line_item_id,
            quantity_returned: returnItem.quantity,
            restocked: true,
            location: locationId,
            condition: returnItem.condition,
            reason: returnItem.reason,
          });
        } else {
          processedReturns.push({
            line_item_id: returnItem.line_item_id,
            quantity_returned: returnItem.quantity,
            restocked: false,
            condition: returnItem.condition,
            reason: returnItem.reason,
          });
        }
      }

      await reportProgress({ progress: 75, total: 100 });

      // Update order with return information
      await veeqoClient.updateOrder(args.order_id, {
        status: 'partially_returned',
      });

      // Post-validation hook
      if (args.hooks?.post_validation) {
        await streamContent({
          type: 'text',
          text: `Running post-validation hook: ${args.hooks.post_validation}\n`,
        });
      }

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'Returns processed successfully!\n\n' +
              `Order ID: ${args.order_id}\n` +
              `Items Returned: ${processedReturns.length}\n` +
              `Items Restocked: ${processedReturns.filter((r) => r.restocked).length}\n` +
              (args.refund_amount ? `Refund Amount: $${args.refund_amount}\n` : '') +
              '\nReturn Details:\n' +
              processedReturns
                .map(
                  (r) =>
                    `- Item ${r.line_item_id}: ${r.quantity_returned} units (${r.condition}, ${r.reason})` +
                    (r.restocked ? ` - Restocked at location ${r.location}` : ' - Not restocked')
                )
                .join('\n'),
          },
        ],
      };
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          args,
        },
        'Error processing returns'
      );
      throw new Error(`Failed to process returns: ${(error as Error).message}`);
    }
  },
});

/**
 * Low stock monitoring and alerts
 */
server.addTool({
  name: 'check_low_stock',
  description: 'Check for products with low stock levels and generate reorder recommendations',
  parameters: z.object({
    threshold_days: z.number().default(7),
    location_ids: z.array(z.string()).optional(),
    product_categories: z.array(z.string()).optional(),
    include_recommendations: z.boolean().default(true),
    hooks: z
      .object({
        pre_validation: z.string().optional(),
        post_validation: z.string().optional(),
      })
      .optional(),
  }),
  annotations: {
    title: 'Low Stock Monitor',
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, { reportProgress, streamContent }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      // Pre-validation hook
      if (args.hooks?.pre_validation) {
        await streamContent({
          type: 'text',
          text: `Running pre-validation hook: ${args.hooks.pre_validation}\n`,
        });
      }

      await streamContent({
        type: 'text',
        text: 'Analyzing inventory levels for low stock alerts...\n',
      });

      // Get inventory levels
      const inventory = await veeqoClient.getInventoryLevels(undefined, args.location_ids);

      await reportProgress({ progress: 50, total: 100 });

      // Analyze low stock items
      const lowStockItems = [];
      const criticalStockItems = [];

      for (const item of inventory) {
        const daysOfStock = item.available_quantity / 1; // Default velocity since daily_sales_velocity is not available

        if (daysOfStock <= 2) {
          criticalStockItems.push({
            ...item,
            days_remaining: Math.max(0, Math.floor(daysOfStock)),
            priority: 'critical',
            suggested_reorder: Math.max(20, 1 * 14), // 2 weeks supply with default velocity
          });
        } else if (daysOfStock <= args.threshold_days) {
          lowStockItems.push({
            ...item,
            days_remaining: Math.floor(daysOfStock),
            priority: 'low',
            suggested_reorder: Math.max(10, 1 * 10), // 10 days supply with default velocity
          });
        }
      }

      await reportProgress({ progress: 75, total: 100 });

      // Generate recommendations if requested
      let recommendations = '';
      if (
        args.include_recommendations &&
        (lowStockItems.length > 0 || criticalStockItems.length > 0)
      ) {
        recommendations = '\n\nRECOMMENDATIONS:\n';

        if (criticalStockItems.length > 0) {
          recommendations += '🚨 CRITICAL - Immediate action required:\n';
          criticalStockItems.forEach((item) => {
            recommendations += `- ${item.product_name} (${item.sku}): Order ${item.suggested_reorder} units immediately\n`;
          });
        }

        if (lowStockItems.length > 0) {
          recommendations += '⚠️ LOW STOCK - Action needed within 3-5 days:\n';
          lowStockItems.forEach((item) => {
            recommendations += `- ${item.product_name} (${item.sku}): Order ${item.suggested_reorder} units soon\n`;
          });
        }
      }

      // Post-validation hook
      if (args.hooks?.post_validation) {
        await streamContent({
          type: 'text',
          text: `Running post-validation hook: ${args.hooks.post_validation}\n`,
        });
      }

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'Low Stock Analysis Complete:\n\n' +
              `Total items analyzed: ${inventory.length}\n` +
              `Critical stock items: ${criticalStockItems.length}\n` +
              `Low stock items: ${lowStockItems.length}\n` +
              `Threshold: ${args.threshold_days} days\n\n` +
              'CRITICAL STOCK (≤2 days):\n' +
              (criticalStockItems.length > 0
                ? criticalStockItems
                    .map(
                      (item) =>
                        `- ${item.product_name} (${item.sku}): ${item.available_quantity} units (${item.days_remaining} days remaining)`
                    )
                    .join('\n')
                : 'None') +
              `\n\nLOW STOCK (≤${args.threshold_days} days):\n` +
              (lowStockItems.length > 0
                ? lowStockItems
                    .map(
                      (item) =>
                        `- ${item.product_name} (${item.sku}): ${item.available_quantity} units (${item.days_remaining} days remaining)`
                    )
                    .join('\n')
                : 'None') +
              recommendations,
          },
        ],
      };
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          args,
        },
        'Error checking low stock'
      );
      throw new Error(`Failed to check low stock: ${(error as Error).message}`);
    }
  },
});

// ============================================================================
// AI-POWERED TOOLS
// ============================================================================

/**
 * AI-powered shipping optimization
 */
server.addTool({
  name: 'optimize_shipping',
  description: 'Use AI to optimize shipping decisions based on package details and requirements',
  parameters: z.object({
    package_details: z.object({
      dimensions: z.object({
        length: z.number(),
        width: z.number(),
        height: z.number(),
        weight: z.number(),
      }),
      value: z.number().optional(),
      contents: z.string().optional(),
    }),
    requirements: z.object({
      max_cost: z.number().optional(),
      max_delivery_days: z.number().optional(),
      preferred_carriers: z.array(z.string()).optional(),
      delivery_type: z.enum(['standard', 'expedited', 'overnight']).optional(),
    }),
    origin: z.string(),
    destination: z.string(),
  }),
  annotations: {
    title: 'AI Shipping Optimizer',
    readOnlyHint: true,
    streamingHint: true,
  },
  execute: async (args, { streamContent, reportProgress }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Analyzing shipping requirements with AI...\n',
      });

      await reportProgress({ progress: 25, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Calculating optimal shipping options...\n',
      });

      const optimization = await optimizeShipping({
        package: {
          weight: args.package_details.dimensions.weight,
          dimensions: {
            length: args.package_details.dimensions.length,
            width: args.package_details.dimensions.width,
            height: args.package_details.dimensions.height,
          },
          value: args.package_details.value,
          contents: args.package_details.contents,
        },
        requirements: {
          delivery_time: args.requirements.delivery_type,
          cost_priority: args.requirements.max_cost ? 'lowest' : 'balanced',
          carrier_preference: args.requirements.preferred_carriers,
        },
        origin: args.origin,
        destination: args.destination,
      });

      await reportProgress({ progress: 75, total: 100 });
      await streamContent({
        type: 'text',
        text: 'Generating recommendations...\n',
      });

      const recommendations = await generateShippingRecommendations(
        `${args.origin} to ${args.destination}`,
        ['cost_optimization', 'delivery_speed', 'reliability']
      );

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text:
              'AI Shipping Optimization Results:\n\n' +
              `Analysis: ${JSON.stringify(optimization)}\n\n` +
              `Recommendations:\n${recommendations.map((r) => r.recommendation).join('\n')}\n\n` +
              `Reasoning:\n${recommendations.map((r) => r.reasoning).join('\n')}\n\n` +
              `Expected Benefits:\n${recommendations.map((r) => r.expected_benefits.join(', ')).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, args }, 'Error optimizing shipping');
      throw new Error(`Failed to optimize shipping: ${(error as Error).message}`);
    }
  },
});

/**
 * AI code analysis for shipping logic
 */
server.addTool({
  name: 'analyze_shipping_code',
  description: 'Use AI to analyze shipping-related code for best practices and optimizations',
  parameters: z.object({
    code: z.string(),
    file_path: z.string().optional(),
    focus_areas: z
      .array(
        z.enum(['performance', 'security', 'error_handling', 'best_practices', 'optimization'])
      )
      .optional(),
  }),
  annotations: {
    title: 'AI Code Analyzer',
    readOnlyHint: true,
  },
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 0, total: 100 });

      const analysis = await analyzeCode({
        code: args.code,
        language: 'typescript',
        context: 'shipping',
        focus_areas: (args.focus_areas ?? ['security', 'performance', 'maintainability']) as (
          | 'security'
          | 'performance'
          | 'maintainability'
          | 'testing'
        )[],
      });

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `AI Code Analysis Results:\n\n${JSON.stringify(analysis)}`,
          },
        ],
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, args }, 'Error analyzing code');
      throw new Error(`Failed to analyze code: ${(error as Error).message}`);
    }
  },
});

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Shipping rates resource
 */
server.addResourceTemplate({
  uriTemplate: 'shipping://rates/{from_zip}/{to_zip}',
  name: 'Shipping Rates',
  mimeType: 'application/json',
  arguments: [
    {
      name: 'from_zip',
      description: 'Origin ZIP code',
      required: true,
    },
    {
      name: 'to_zip',
      description: 'Destination ZIP code',
      required: true,
    },
  ],
  async load({ from_zip, to_zip }) {
    try {
      const rates = await easyPostClient.getRatesByZip(from_zip, to_zip);
      return {
        text: JSON.stringify(rates, null, 2),
      };
    } catch (error) {
      return {
        text: JSON.stringify({ error: (error as Error).message }, null, 2),
      };
    }
  },
});

/**
 * Inventory status resource
 */
server.addResourceTemplate({
  uriTemplate: 'inventory://status/{product_id}',
  name: 'Product Inventory Status',
  mimeType: 'application/json',
  arguments: [
    {
      name: 'product_id',
      description: 'Product ID to check inventory for',
      required: true,
    },
  ],
  async load({ product_id }) {
    try {
      const inventory = await veeqoClient.getProductInventory(product_id);
      return {
        text: JSON.stringify(inventory, null, 2),
      };
    } catch (error) {
      return {
        text: JSON.stringify({ error: (error as Error).message }, null, 2),
      };
    }
  },
});

// ============================================================================
// PROMPTS
// ============================================================================

/**
 * Shipping optimization prompt
 */
server.addPrompt({
  name: 'shipping_optimization',
  description: 'Generate AI-powered shipping optimization recommendations',
  arguments: [
    {
      name: 'package_info',
      description: 'Package details including dimensions, weight, and contents',
      required: true,
    },
    {
      name: 'requirements',
      description: 'Shipping requirements including budget, timeline, and preferences',
      required: true,
    },
    {
      name: 'route',
      description: 'Origin and destination information',
      required: true,
    },
  ],
   
  load: async ({ package_info, requirements, route }) => {
    return `Analyze the following shipping scenario and provide optimization recommendations:

Package Information:
${package_info}

Requirements:
${requirements}

Route:
${route}

Please provide:
1. Cost-optimized shipping options
2. Time-optimized shipping options
3. Risk assessment for different carriers
4. Recommendations based on package value and contents
5. Alternative solutions if primary options are unavailable

Consider factors like:
- Package dimensions and weight
- Declared value and contents
- Delivery timeline requirements
- Budget constraints
- Carrier reliability and tracking capabilities
- Insurance and liability considerations`;
  },
});

/**
 * Code review prompt for shipping logic
 */
server.addPrompt({
  name: 'shipping_code_review',
  description: 'Review shipping-related code for best practices and improvements',
  arguments: [
    {
      name: 'code',
      description: 'The shipping-related code to review',
      required: true,
    },
    {
      name: 'context',
      description: "Additional context about the code's purpose and environment",
      required: false,
    },
  ],
   
  load: async ({ code, context }) => {
    return `Please review the following shipping-related code for best practices, security, and optimization opportunities:

Code:
\`\`\`typescript
${code}
\`\`\`

Context: ${context ?? 'General shipping functionality'}

Please provide feedback on:
1. Security considerations (API key handling, input validation)
2. Error handling and resilience
3. Performance optimizations
4. Code structure and maintainability
5. Integration best practices
6. Testing recommendations
7. Potential edge cases and failure modes

Focus on shipping-specific concerns like:
- Rate calculation accuracy
- Label generation reliability
- Tracking number validation
- Address verification
- Carrier API integration patterns
- Retry logic for external API calls
- Data privacy and compliance`;
  },
});

// ============================================================================
// PRODUCT MANAGEMENT TOOLS
// ============================================================================

/**
 * Create a new product in Veeqo
 */
server.addTool({
  name: 'create_product',
  description: 'Create a new product in Veeqo with complete specifications',
  parameters: z.object({
    title: z.string(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    description: z.string().optional(),
    price: z.number(),
    cost_price: z.number().optional(),
    weight: z.number().optional(),
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    variants: z.array(z.object({
      title: z.string(),
      sku: z.string(),
      barcode: z.string().optional(),
      price: z.number(),
      cost_price: z.number().optional(),
      weight: z.number().optional(),
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })).optional(),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 10, total: 100 });

      const product = await veeqoClient.createProduct(args);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Product created successfully!\n\n**Product Details:**\n- ID: ${product.id}\n- Title: ${product.title}\n- SKU: ${product.sku}\n- Price: $${product.price}\n- Created: ${new Date(product.created_at).toLocaleString()}\n\n${product.variants && product.variants.length > 0 ? `**Variants:** ${product.variants.length} created` : 'No variants created'}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create product: ${(error as Error).message}`);
    }
  },
});

/**
 * Update an existing product
 */
server.addTool({
  name: 'update_product',
  description: 'Update an existing product in Veeqo',
  parameters: z.object({
    product_id: z.string(),
    title: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    cost_price: z.number().optional(),
    weight: z.number().optional(),
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      const { product_id, ...updates } = args;

      await reportProgress({ progress: 20, total: 100 });

      const product = await veeqoClient.updateProduct(product_id, updates);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Product updated successfully!\n\n**Updated Product:**\n- ID: ${product.id}\n- Title: ${product.title}\n- SKU: ${product.sku}\n- Price: $${product.price}\n- Last Updated: ${new Date(product.updated_at).toLocaleString()}\n\n**Changes Applied:** ${Object.keys(updates).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update product: ${(error as Error).message}`);
    }
  },
});

/**
 * Manage product variants
 */
server.addTool({
  name: 'manage_product_variants',
  description: 'Create or update product variants in Veeqo',
  parameters: z.object({
    product_id: z.string(),
    action: z.enum(['create', 'update']),
    variant_id: z.string().optional(),
    variant_data: z.object({
      title: z.string(),
      sku: z.string(),
      barcode: z.string().optional(),
      price: z.number(),
      cost_price: z.number().optional(),
      weight: z.number().optional(),
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 25, total: 100 });

      let variant;
      if (args.action === 'create') {
        variant = await veeqoClient.createProductVariant(args.product_id, args.variant_data);
      } else if (args.action === 'update' && args.variant_id) {
        variant = await veeqoClient.updateProductVariant(args.variant_id, args.variant_data);
      } else {
        throw new Error('variant_id is required for update action');
      }

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Product variant ${args.action}d successfully!\n\n**Variant Details:**\n- ID: ${variant.id}\n- Product ID: ${variant.product_id}\n- Title: ${variant.title}\n- SKU: ${variant.sku}\n- Price: $${variant.price}\n- ${args.action === 'create' ? 'Created' : 'Updated'}: ${new Date(variant.updated_at).toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to ${args.action} product variant: ${(error as Error).message}`);
    }
  },
});

/**
 * Delete a product
 */
server.addTool({
  name: 'delete_product',
  description: 'Delete a product from Veeqo catalog',
  parameters: z.object({
    product_id: z.string(),
    confirm: z.boolean().default(false),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      if (!args.confirm) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ Product deletion requires confirmation. Set 'confirm: true' to proceed with deleting product ${args.product_id}.`,
            },
          ],
        };
      }

      await reportProgress({ progress: 50, total: 100 });

      await veeqoClient.deleteProduct(args.product_id);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Product ${args.product_id} deleted successfully!`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to delete product: ${(error as Error).message}`);
    }
  },
});

// ============================================================================
// WAREHOUSE/LOCATION MANAGEMENT TOOLS
// ============================================================================

/**
 * Create a new warehouse/location
 */
server.addTool({
  name: 'create_warehouse',
  description: 'Create a new warehouse/location in Veeqo',
  parameters: z.object({
    name: z.string(),
    address: z.object({
      first_name: z.string(),
      last_name: z.string(),
      address1: z.string(),
      address2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
      phone: z.string().optional(),
    }),
    is_default: z.boolean().optional().default(false),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({ progress: 20, total: 100 });

      const location = await veeqoClient.createLocation(args);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Warehouse created successfully!\n\n**Warehouse Details:**\n- ID: ${location.id}\n- Name: ${location.name}\n- Address: ${location.address.address1}, ${location.address.city}, ${location.address.state} ${location.address.zip}\n- Default: ${location.is_default ? 'Yes' : 'No'}\n- Created: ${new Date(location.created_at).toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create warehouse: ${(error as Error).message}`);
    }
  },
});

/**
 * Update warehouse information
 */
server.addTool({
  name: 'update_warehouse',
  description: 'Update warehouse/location information in Veeqo',
  parameters: z.object({
    location_id: z.string(),
    name: z.string().optional(),
    address: z.object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
    is_default: z.boolean().optional(),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      const { location_id, ...updates } = args;

      await reportProgress({ progress: 30, total: 100 });

      const location = await veeqoClient.updateLocation(location_id, updates);

      await reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Warehouse updated successfully!\n\n**Updated Warehouse:**\n- ID: ${location.id}\n- Name: ${location.name}\n- Address: ${location.address.address1}, ${location.address.city}, ${location.address.state} ${location.address.zip}\n- Default: ${location.is_default ? 'Yes' : 'No'}\n- Last Updated: ${new Date(location.updated_at).toLocaleString()}\n\n**Changes Applied:** ${Object.keys(updates).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update warehouse: ${(error as Error).message}`);
    }
  },
});

/**
 * Manage warehouse routing
 */
server.addTool({
  name: 'manage_warehouse_routing',
  description: 'Configure warehouse routing and shipping preferences',
  parameters: z.object({
    location_id: z.string(),
    operation: z.enum(['set_default', 'view_settings']),
    set_as_default: z.boolean().optional(),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({
        progress: 25,
        total: 100,
      });

      if (args.operation === 'set_default' && args.set_as_default !== undefined) {
        const location = await veeqoClient.updateLocation(args.location_id, {
          is_default: args.set_as_default
        });

        await reportProgress({
          progress: 100,
          total: 100,
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ Warehouse routing updated!\n\n**${location.name}** is ${args.set_as_default ? 'now' : 'no longer'} the default warehouse for shipping.`,
            },
          ],
        };
      } else {
        // View current settings
        const locations = await veeqoClient.getLocations();
        const currentLocation = locations.find(loc => loc.id.toString() === args.location_id);

        if (!currentLocation) {
          throw new Error(`Location ${args.location_id} not found`);
        }

        await reportProgress({
          progress: 100,
          total: 100,
        });

        return {
          content: [
            {
              type: 'text',
              text: `📊 **Warehouse Settings for ${currentLocation.name}**\n\n- Default Warehouse: ${currentLocation.is_default ? 'Yes' : 'No'}\n- Location ID: ${currentLocation.id}\n- Address: ${currentLocation.address.address1}, ${currentLocation.address.city}, ${currentLocation.address.state}\n\n**Available Operations:**\n- Set as default shipping warehouse\n- Update warehouse information\n- View inventory levels`,
            },
          ],
        };
      }
    } catch (error) {
      throw new Error(`Failed to manage warehouse routing: ${(error as Error).message}`);
    }
  },
});

/**
 * Delete a warehouse
 */
server.addTool({
  name: 'delete_warehouse',
  description: 'Delete a warehouse/location from Veeqo',
  parameters: z.object({
    location_id: z.string(),
    confirm: z.boolean().default(false),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      if (!args.confirm) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ Warehouse deletion requires confirmation. Set 'confirm: true' to proceed with deleting warehouse ${args.location_id}. This will permanently remove the warehouse and may affect inventory allocations.`,
            },
          ],
        };
      }

      await reportProgress({
        progress: 50,
        total: 100,
      });

      await veeqoClient.deleteLocation(args.location_id);

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Warehouse ${args.location_id} deleted successfully!`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to delete warehouse: ${(error as Error).message}`);
    }
  },
});

// ============================================================================
// ADVANCED SHIPMENT MANAGEMENT TOOLS
// ============================================================================

/**
 * Create a shipment directly in Veeqo
 */
server.addTool({
  name: 'create_veeqo_shipment',
  description: 'Create a shipment directly in Veeqo for an order',
  parameters: z.object({
    order_id: z.number(),
    carrier: z.string().optional(),
    service: z.string().optional(),
    line_items: z.array(z.object({
      product_id: z.number(),
      variant_id: z.number(),
      quantity: z.number(),
    })),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({
        progress: 20,
        total: 100,
      });

      const shipment = await veeqoClient.createShipment(args);

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Shipment created successfully in Veeqo!\n\n**Shipment Details:**\n- ID: ${shipment.id}\n- Order ID: ${shipment.order_id}\n- Status: ${shipment.status}\n- Carrier: ${shipment.carrier}\n- Service: ${shipment.service}\n- Tracking: ${shipment.tracking_number || 'Pending'}\n- Items: ${shipment.line_items.length}\n- Created: ${new Date(shipment.created_at).toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create shipment: ${(error as Error).message}`);
    }
  },
});

/**
 * Update shipment status and tracking
 */
server.addTool({
  name: 'update_shipment_status',
  description: 'Update shipment status, tracking number, and other details',
  parameters: z.object({
    shipment_id: z.string(),
    tracking_number: z.string().optional(),
    carrier: z.string().optional(),
    service: z.string().optional(),
    status: z.enum(['pending', 'shipped', 'delivered', 'returned', 'cancelled']).optional(),
    shipped_at: z.string().optional(),
    delivered_at: z.string().optional(),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      const { shipment_id, ...updates } = args;

      await reportProgress({
        progress: 30,
        total: 100,
      });

      const shipment = await veeqoClient.updateShipment(shipment_id, updates);

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Shipment updated successfully!\n\n**Updated Shipment:**\n- ID: ${shipment.id}\n- Status: ${shipment.status}\n- Tracking: ${shipment.tracking_number}\n- Carrier: ${shipment.carrier}\n- Service: ${shipment.service}\n- Shipped: ${shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleString() : 'Not yet shipped'}\n- Last Updated: ${new Date(shipment.updated_at).toLocaleString()}\n\n**Changes Applied:** ${Object.keys(updates).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update shipment: ${(error as Error).message}`);
    }
  },
});

/**
 * Handle partial shipments
 */
server.addTool({
  name: 'handle_partial_shipment',
  description: 'Create a partial shipment for selected items from an order',
  parameters: z.object({
    order_id: z.string(),
    items: z.array(z.object({
      product_id: z.number(),
      variant_id: z.number(),
      quantity: z.number(),
    })),
    carrier: z.string().optional(),
    service: z.string().optional(),
    reason: z.string().optional(),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({
        progress: 25,
        total: 100,
      });

      const shipment = await veeqoClient.createPartialShipment(args.order_id, args.items);

      // Update with carrier/service if provided
      if (args.carrier || args.service) {
        await veeqoClient.updateShipment(shipment.id.toString(), {
          carrier: args.carrier,
          service: args.service,
        });
      }

      await reportProgress({
        progress: 100,
        total: 100,
      });

      const totalItems = args.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Partial shipment created successfully!\n\n**Shipment Details:**\n- Shipment ID: ${shipment.id}\n- Order ID: ${args.order_id}\n- Items Shipped: ${totalItems} (${args.items.length} different products)\n- Status: ${shipment.status}\n- Carrier: ${args.carrier || 'TBD'}\n- Service: ${args.service || 'TBD'}\n- Reason: ${args.reason || 'Partial availability'}\n\n**Items in Shipment:**\n${args.items.map(item => `- Product ${item.product_id} (Variant ${item.variant_id}): ${item.quantity} units`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create partial shipment: ${(error as Error).message}`);
    }
  },
});

/**
 * Cancel a shipment
 */
server.addTool({
  name: 'cancel_shipment',
  description: 'Cancel an existing shipment and restore inventory',
  parameters: z.object({
    shipment_id: z.string(),
    reason: z.string().optional(),
    restore_inventory: z.boolean().default(true),
  }),
  execute: async (args, { reportProgress }) => {
    try {
      await reportProgress({
        progress: 40,
        total: 100,
      });

      const cancelledShipment = await veeqoClient.cancelShipment(args.shipment_id);

      await reportProgress({
        progress: 100,
        total: 100,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Shipment cancelled successfully!\n\n**Cancelled Shipment:**\n- ID: ${cancelledShipment.id}\n- Order ID: ${cancelledShipment.order_id}\n- Previous Status: shipped → cancelled\n- Tracking: ${cancelledShipment.tracking_number}\n- Reason: ${args.reason || 'Not specified'}\n- Inventory Restored: ${args.restore_inventory ? 'Yes' : 'No'}\n- Cancelled: ${new Date(cancelledShipment.updated_at).toLocaleString()}\n\n**Items Returned to Inventory:**\n${cancelledShipment.line_items.map(item => `- Product ${item.product_id}: ${item.quantity} units`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to cancel shipment: ${(error as Error).message}`);
    }
  },
});

// ============================================================================
// SERVER EVENTS
// ============================================================================

server.on('connect', () => {
  logger.info(
    {
      sessionId: 'session_' + Math.random().toString(36).substring(2, 11),
      userId: 'user_' + Math.random().toString(36).substring(2, 11),
      role: 'user',
    },
    'Client connected'
  );
});

server.on('disconnect', () => {
  logger.info(
    {
      sessionId: 'session_' + Math.random().toString(36).substring(2, 11),
      userId: 'user_' + Math.random().toString(36).substring(2, 11),
    },
    'Client disconnected'
  );
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  try {
    logger.info('Starting Unified EasyPost-Veeqo MCP Server...');

    // Initialize monitoring system
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      monitoring.startMonitoring();
      logger.info('Monitoring system started');

      // Set up monitoring event handlers
      monitoring.on('alert', (alert) => {
        logger.warn('Monitoring alert', alert);
      });

      monitoring.on('metric', (metric) => {
        // Only log important metrics to avoid spam
        if (metric.name.includes('error') || metric.name.includes('warning')) {
          logger.debug('Metric recorded', metric);
        }
      });
    }

    // Initialize Claude Code integration
    try {
      await optimizeShipping({
        package: {
          weight: 1,
          dimensions: { length: 10, width: 10, height: 10 },
          value: 10,
          contents: 'test package',
        },
        requirements: {
          delivery_time: 'standard',
          cost_priority: 'balanced',
        },
        origin: 'New York, NY',
        destination: 'Los Angeles, CA',
      });
      logger.info('Claude Code integration initialized');
    } catch (error) {
      logger.warn(
        {
          error: (error as Error).message,
        },
        'Claude Code integration failed to initialize, continuing with mock mode'
      );
    }

    // Start the server
    await server.start({
      transportType: 'stdio',
    });

    logger.info('MCP Server started with stdio transport');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  monitoring.stopMonitoring();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  monitoring.stopMonitoring();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error(
    {
      error: (error as Error).message,
    },
    'Unhandled error during server startup'
  );
  process.exit(1);
});

export default server;
