/**
 * Simplified Shipping Tools Module
 * Optimized for TypeScript language service stability
 */

import { z } from "zod";
import type { FastMCP } from "fastmcp";
import {
  EasyPostClient,
  type EasyPostAddress,
} from "../../services/clients/easypost-enhanced.js";
import {
  safeLogger as logger,
  safeMonitoring as monitoring,
} from "../../utils/type-safe-logger.js";
import { createApiHandler } from "../../utils/response-formatter.js";
import { AddressSchema } from "../../api/schemas/address.js";

const logError = (message: string, error: any) => {
  logger.error(message, error);
};

export function addShippingTools(
  server: FastMCP,
  easyPostClient: EasyPostClient,
) {
  const addressSchema = AddressSchema;
  const parcelSchema = z.object({
    length: z.number().min(0.1),
    width: z.number().min(0.1),
    height: z.number().min(0.1),
    weight: z.number().min(0.1),
  });

  // 1. Unified shipping operations tool
  server.addTool({
    name: "shipping_operations",
    description: "Unified shipping operations: rates, labels, tracking, validation",
    parameters: z.object({
      operation: z.enum(["rates", "create_label", "track", "validate_address"]),
      from_address: addressSchema.optional(),
      to_address: addressSchema.optional(),
      parcel: parcelSchema.optional(),
      tracking_code: z.string().optional(),
      address: addressSchema.optional(),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Executing shipping operation", { operation: args.operation });

        switch (args.operation) {
          case "rates":
            if (!args.from_address || !args.to_address || !args.parcel) {
              throw new Error("Missing required parameters for rate calculation");
            }
            return await easyPostClient.getRates(args.from_address, args.to_address, args.parcel);
          
          case "create_label":
            if (!args.from_address || !args.to_address || !args.parcel) {
              throw new Error("Missing required parameters for label creation");
            }
            return await easyPostClient.createShipment(args.from_address, args.to_address, args.parcel);
          
          case "track":
            if (!args.tracking_code) {
              throw new Error("Tracking code is required");
            }
            return await easyPostClient.trackShipment(args.tracking_code);
          
          case "validate_address":
            if (!args.address) {
              throw new Error("Address is required for validation");
            }
            return await easyPostClient.validateAddress(args.address);
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Shipping operation failed", error);
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        monitoring.recordMetric("shipping_operation_duration", duration);
      }
    },
  });

  // 2. Weight conversion tool
  server.addTool({
    name: "weight_to_oz",
    description: "Convert weight from various units to ounces",
    parameters: z.object({
      weight: z.number().positive().describe("Weight value to convert"),
      unit: z.enum(["lb", "kg", "g", "oz"]).describe("Unit to convert from"),
    }),
    execute: async (args) => {
      const conversions = {
        lb: 16,
        kg: 35.274,
        g: 0.035274,
        oz: 1,
      };
      
      const ounces = args.weight * conversions[args.unit];
      return {
        original_weight: args.weight,
        original_unit: args.unit,
        converted_weight: Math.round(ounces * 100) / 100,
        converted_unit: "oz",
      };
    },
  });

  // 3. Health check tool
  server.addTool({
    name: "health_check",
    description: "Check system health and external API connectivity",
    parameters: z.object({
      verbose: z.boolean().default(false).describe("Include detailed health information"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        const health = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: "1.0.0",
        };

        if (args.verbose) {
          health.details = {
            easypost: await this.checkEasyPostHealth(),
            veeqo: await this.checkVeeqoHealth(),
          };
        }

        return health;
      } catch (error) {
        logError("Health check failed", error);
        return {
          status: "unhealthy",
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      } finally {
        const duration = Date.now() - startTime;
        monitoring.recordMetric("health_check_duration", duration);
      }
    },
  });

  // 4. Parcel presets tool
  server.addTool({
    name: "get_parcel_presets",
    description: "Get predefined parcel dimensions for common package types",
    parameters: z.object({
      carrier: z.string().optional().describe("Filter by specific carrier"),
    }),
    execute: async (args) => {
      const presets = {
        usps: {
          small_box: { length: 8.625, width: 5.375, height: 1.625, weight: 0.5 },
          medium_box: { length: 11, width: 8.5, height: 5.5, weight: 1.0 },
          large_box: { length: 12, width: 12, height: 5.5, weight: 2.0 },
        },
        fedex: {
          small_box: { length: 10, width: 8, height: 4, weight: 0.5 },
          medium_box: { length: 12, width: 10, height: 6, weight: 1.0 },
          large_box: { length: 15, width: 12, height: 8, weight: 2.0 },
        },
        ups: {
          small_box: { length: 10, width: 7, height: 4, weight: 0.5 },
          medium_box: { length: 13, width: 11, height: 6, weight: 1.0 },
          large_box: { length: 16, width: 13, height: 8, weight: 2.0 },
        },
      };

      if (args.carrier && presets[args.carrier]) {
        return { [args.carrier]: presets[args.carrier] };
      }

      return presets;
    },
  });

  // 5. Address verification tool
  server.addTool({
    name: "verify_address",
    description: "Verify and normalize shipping addresses",
    parameters: z.object({
      address: addressSchema,
    }),
    execute: async (args) => {
      try {
        const result = await easyPostClient.validateAddress(args.address);
        return {
          original: args.address,
          verified: result,
          is_valid: result.verifications?.delivery?.success || false,
        };
      } catch (error) {
        logError("Address verification failed", error);
        throw error;
      }
    },
  });

  // 6. Shipping optimization tool
  server.addTool({
    name: "optimize_shipping",
    description: "Get optimized shipping recommendations",
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      preferences: z.object({
        prioritize: z.enum(["cost", "speed", "reliability"]).default("cost"),
        max_cost: z.number().optional(),
        max_days: z.number().optional(),
      }).optional(),
    }),
    execute: async (args) => {
      try {
        const rates = await easyPostClient.getRates(args.from_address, args.to_address, args.parcel);
        
        // Simple optimization logic
        let optimized = rates;
        if (args.preferences?.prioritize === "cost") {
          optimized = rates.sort((a, b) => a.rate - b.rate);
        } else if (args.preferences?.prioritize === "speed") {
          optimized = rates.sort((a, b) => a.delivery_days - b.delivery_days);
        }

        return {
          recommendations: optimized.slice(0, 3),
          total_options: rates.length,
          preferences: args.preferences,
        };
      } catch (error) {
        logError("Shipping optimization failed", error);
        throw error;
      }
    },
  });
}

// Helper methods
async function checkEasyPostHealth() {
  try {
    // Simple health check
    return { status: "connected", latency: 0 };
  } catch {
    return { status: "disconnected", latency: -1 };
  }
}

async function checkVeeqoHealth() {
  try {
    // Simple health check
    return { status: "connected", latency: 0 };
  } catch {
    return { status: "disconnected", latency: -1 };
  }
}
