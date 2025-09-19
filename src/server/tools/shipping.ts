/**
 * Shipping Tools Module for FastMCP Server
 * Contains all shipping-related tools and functionality
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
  // Use canonical AddressSchema from schemas
  const addressSchema = AddressSchema;

  const parcelSchema = z.object({
    length: z.number().min(0.1),
    width: z.number().min(0.1),
    height: z.number().min(0.1),
    weight: z.number().min(0.1),
  });

  /**
   * Calculate shipping rates from multiple carriers
   */
  server.addTool({
    name: "calculate_shipping_rates",
    description:
      "Calculate shipping rates from multiple carriers for a package",
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      service_types: z
        .array(z.string())
        .optional()
        .describe("Optional array of specific service types to filter"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Calculating shipping rates", {
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
          weight: args.parcel.weight,
        });

        const rates = await easyPostClient.getRates(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel,
        );

        // Filter by service types if provided
        const filteredRates = args.service_types
          ? rates.filter((rate) => args.service_types!.includes(rate.service))
          : rates;

        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/rates", duration, 200);

        logger.info(
          `Found ${filteredRates.length} shipping rates in ${duration}ms`,
        );
        const result = {
          rates: filteredRates,
          count: filteredRates.length,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/rates", duration, 500, true);
        logError("Failed to calculate shipping rates", error);
        throw new Error(`Shipping rate calculation failed: ${error.message}`);
      }
    },
  });

  /**
   * Create shipping label
   */
  server.addTool({
    name: "create_shipping_label",
    description: "Create a shipping label for a package",
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      service: z
        .string()
        .describe('Shipping service (e.g., "Ground", "Priority", "Express")'),
      carrier: z
        .string()
        .describe('Shipping carrier (e.g., "USPS", "UPS", "FedEx")'),
      reference: z
        .string()
        .optional()
        .describe("Optional reference number for tracking"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Creating shipping label", {
          carrier: args.carrier,
          service: args.service,
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
        });

        const label = await easyPostClient.createShipment(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel,
          { service: args.service, carrier: args.carrier },
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/shipments", duration, 200);

        logger.info(
          `Created shipping label ${label.tracking_code} in ${duration}ms`,
        );
        const result = {
          ...label,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/shipments", duration, 500, true);
        logError("Failed to create shipping label", error);
        throw new Error(`Label creation failed: ${error.message}`);
      }
    },
  });

  /**
   * Track shipment status
   */
  server.addTool({
    name: "track_shipment",
    description: "Track the status and location of a shipment",
    parameters: z.object({
      tracking_code: z.string().describe("Tracking number or code"),
      carrier: z
        .string()
        .optional()
        .describe("Carrier name (optional, helps with accuracy)"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      const apiHandler = createApiHandler(
        "easypost",
        "/trackers",
        "track shipment",
      );

      try {
        logger.info("Tracking shipment", {
          tracking_code: args.tracking_code,
          carrier: args.carrier,
        });

        const trackingInfo = await easyPostClient.trackPackage(
          args.tracking_code,
        );
        monitoring.recordApiCall(
          "easypost",
          "/trackers",
          Date.now() - startTime,
          200,
        );

        logger.info(
          `Retrieved tracking info for ${args.tracking_code} in ${Date.now() - startTime}ms`,
        );
        return apiHandler.success(trackingInfo, startTime);
      } catch (error: any) {
        apiHandler.error(error, startTime);
        throw new Error(`Shipment tracking failed: ${error.message}`);
      }
    },
  });

  /**
   * Validate and normalize addresses
   */
  server.addTool({
    name: "validate_address",
    description: "Validate and normalize a shipping address",
    parameters: z.object({
      address: addressSchema,
    }),
    execute: async (args) => {
      const startTime = Date.now();
      const apiHandler = createApiHandler(
        "easypost",
        "/addresses/verify",
        "validate address",
      );

      try {
        logger.info("Validating address", {
          city: args.address.city,
          state: args.address.state,
          zip: args.address.zip,
        });

        const validatedAddress = await easyPostClient.verifyAddress(
          args.address as EasyPostAddress,
        );
        monitoring.recordApiCall(
          "easypost",
          "/addresses/verify",
          Date.now() - startTime,
          200,
        );

        logger.info(`Validated address in ${Date.now() - startTime}ms`);
        return apiHandler.success(validatedAddress, startTime);
      } catch (error: any) {
        apiHandler.error(error, startTime);
        throw new Error(`Address validation failed: ${error.message}`);
      }
    },
  });

  /**
   * Get parcel presets for common package types
   */
  server.addTool({
    name: "get_parcel_presets",
    description: "Get predefined parcel dimensions for common package types",
    parameters: z.object({
      carrier: z
        .string()
        .optional()
        .describe("Filter by specific carrier (USPS, UPS, FedEx)"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Fetching parcel presets", { carrier: args.carrier });

        const presets = await easyPostClient.getParcelPresets(args.carrier);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/parcel_presets", duration, 200);

        logger.info(
          `Retrieved ${presets.length} parcel presets in ${duration}ms`,
        );
        const result = {
          presets,
          count: presets.length,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/parcel_presets",
          duration,
          500,
          true,
        );
        logError("Failed to get parcel presets", error);
        throw new Error(`Failed to retrieve parcel presets: ${error.message}`);
      }
    },
  });

  /**
   * Advanced shipping optimization with multi-carrier analysis
   */
  server.addTool({
    name: "optimize_shipping",
    description:
      "Advanced shipping optimization with multi-carrier rate comparison and intelligent recommendations",
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      preferences: z
        .object({
          max_cost: z.number().optional().describe("Maximum acceptable cost"),
          max_delivery_days: z
            .number()
            .optional()
            .describe("Maximum acceptable delivery days"),
          preferred_carriers: z
            .array(z.string())
            .optional()
            .describe("Preferred carriers (USPS, UPS, FedEx)"),
          prioritize_speed: z
            .boolean()
            .default(false)
            .describe("Prioritize fastest delivery"),
          prioritize_cost: z
            .boolean()
            .default(true)
            .describe("Prioritize lowest cost"),
        })
        .optional(),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Optimizing shipping options", {
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
          weight: args.parcel.weight,
          preferences: args.preferences,
        });

        // Use the optimizeShipping function from core tools
        // optimizeShipping removed - AI integration disabled
        const optimizationRequest = {
          fromAddress: args.from_address,
          toAddress: args.to_address,
          parcel: args.parcel,
          preferences: args.preferences
            ? {
                maxCost: args.preferences.max_cost,
                maxDeliveryDays: args.preferences.max_delivery_days,
                preferredCarriers: args.preferences.preferred_carriers,
                prioritizeSpeed: args.preferences.prioritize_speed,
                prioritizeCost: args.preferences.prioritize_cost,
              }
            : undefined,
        };

        // AI optimization disabled - returning basic rate comparison instead
        const rates = await easyPostClient.getRates(
          optimizationRequest.fromAddress,
          optimizationRequest.toAddress,
          optimizationRequest.parcel,
        );
        const optimization = {
          recommendations: rates.map((rate) => ({
            carrier: rate.carrier,
            service: rate.service,
            cost: parseFloat(rate.rate),
            delivery_days: rate.delivery_days || 3,
            confidence_score: 0.8,
            reasoning: `Basic rate comparison for ${rate.carrier} ${rate.service}`,
          })),
          total_options: rates.length,
          optimization_metadata: {
            method: "basic_rate_comparison",
            ai_enabled: false,
          },
        };

        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/optimize", duration, 200);

        logger.info(`Completed shipping optimization in ${duration}ms`, {
          totalRates: optimization.total_options,
          recommendations: Object.keys(optimization.recommendations || {}),
        });

        const result = {
          ...optimization,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/optimize", duration, 500, true);
        logError("Failed to optimize shipping", error);
        throw new Error(`Shipping optimization failed: ${error.message}`);
      }
    },
  });

  /**
   * Convert weight units to ounces
   */
  server.addTool({
    name: "weight_to_oz",
    description: "Convert weight from various units to ounces",
    parameters: z.object({
      weight: z.number().positive().describe("Weight value to convert"),
      unit: z.enum(["lb", "kg", "g", "oz"]).describe("Unit to convert from"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Converting weight to ounces", {
          weight: args.weight,
          unit: args.unit,
        });

        const { weightToOz } = await import("../../core/tools/weight-to-oz.js");
        const result = await weightToOz(args);

        const duration = Date.now() - startTime;
        logger.info(`Weight conversion completed in ${duration}ms`);

        return JSON.stringify(
          {
            ...result,
            processing_time_ms: duration,
          },
          null,
          2,
        );
      } catch (error: any) {
        logError("Failed to convert weight", error);
        throw new Error(`Weight conversion failed: ${error.message}`);
      }
    },
  });

  /**
   * System health check
   */
  server.addTool({
    name: "health_check",
    description: "Check system health and external API connectivity",
    parameters: z.object({
      verbose: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include detailed metrics"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Running health check", { verbose: args.verbose });

        const { health } = await import("../../core/tools/health.js");
        const healthStatus = await health();

        const duration = Date.now() - startTime;
        logger.info(`Health check completed in ${duration}ms`);

        return JSON.stringify(
          {
            ...healthStatus,
            processing_time_ms: duration,
          },
          null,
          2,
        );
      } catch (error: any) {
        logError("Health check failed", error);
        throw new Error(`Health check failed: ${error.message}`);
      }
    },
  });

  // ============================================================================
  // ADVANCED EASYPOST TOOLS
  // ============================================================================

  /**
   * Get available carriers and their services
   */
  server.addTool({
    name: "get_carriers",
    description: "Get list of available carriers and their services",
    parameters: z.object({}),
    execute: async (_args) => {
      const startTime = Date.now();
      try {
        logger.info("Fetching available carriers");

        const carriers = await easyPostClient.getCarriers();

        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/carriers", duration, 200);

        logger.info(`Retrieved ${carriers.length} carriers in ${duration}ms`);
        const result = {
          carriers,
          count: carriers.length,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/carriers", duration, 500, true);
        logError("Failed to get carriers", error);
        throw new Error(`Failed to get carriers: ${error.message}`);
      }
    },
  });

  /**
   * Get rates from specific carriers
   */
  server.addTool({
    name: "get_rates_by_carriers",
    description: "Get shipping rates from specific carriers only",
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      carriers: z
        .array(z.string())
        .describe("Array of carrier names (USPS, UPS, FedEx, DHL)"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Getting rates by carriers", {
          carriers: args.carriers,
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
        });

        const rates = await easyPostClient.getRatesByCarriers(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel,
          args.carriers,
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/rates/by-carriers",
          duration,
          200,
        );

        logger.info(
          `Found ${rates.length} carrier-specific rates in ${duration}ms`,
        );
        const result = {
          rates,
          count: rates.length,
          requested_carriers: args.carriers,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/rates/by-carriers",
          duration,
          500,
          true,
        );
        logError("Failed to get rates by carriers", error);
        throw new Error(`Failed to get rates by carriers: ${error.message}`);
      }
    },
  });

  /**
   * Get international shipping rates
   */
  server.addTool({
    name: "get_international_rates",
    description: "Get international shipping rates with customs support",
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      customs_info: z
        .object({
          contents_type: z.enum([
            "merchandise",
            "documents",
            "gift",
            "returned_goods",
            "sample",
            "other",
          ]),
          contents_explanation: z.string().optional(),
          customs_certify: z.boolean().default(true),
          customs_signer: z.string(),
          customs_items: z.array(
            z.object({
              description: z.string(),
              quantity: z.number(),
              weight: z.number(),
              value: z.number(),
              origin_country: z.string(),
            }),
          ),
        })
        .optional(),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Getting international rates", {
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
          to_country: args.to_address.country,
        });

        const rates = await easyPostClient.getInternationalRates(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel,
          args.customs_info,
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/rates/international",
          duration,
          200,
        );

        logger.info(
          `Found ${rates.length} international rates in ${duration}ms`,
        );
        const result = {
          rates,
          count: rates.length,
          is_international:
            args.from_address.country !== args.to_address.country,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/rates/international",
          duration,
          500,
          true,
        );
        logError("Failed to get international rates", error);
        throw new Error(`Failed to get international rates: ${error.message}`);
      }
    },
  });

  /**
   * Get carrier account information
   */
  server.addTool({
    name: "get_carrier_accounts",
    description: "Get carrier account information and status",
    parameters: z.object({}),
    execute: async (_args) => {
      const startTime = Date.now();
      try {
        logger.info("Fetching carrier accounts");

        const accounts = await easyPostClient.getCarrierAccounts();

        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/carrier_accounts",
          duration,
          200,
        );

        logger.info(
          `Retrieved ${accounts.length} carrier accounts in ${duration}ms`,
        );
        const result = {
          accounts,
          count: accounts.length,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/carrier_accounts",
          duration,
          500,
          true,
        );
        logError("Failed to get carrier accounts", error);
        throw new Error(`Failed to get carrier accounts: ${error.message}`);
      }
    },
  });

  /**
   * Purchase shipment with specific carrier
   */
  server.addTool({
    name: "purchase_shipment_with_carrier",
    description: "Purchase a shipment with a specific carrier and service",
    parameters: z.object({
      shipment_id: z.string().describe("Shipment ID to purchase"),
      carrier: z.string().describe("Carrier name (USPS, UPS, FedEx, DHL)"),
      service: z
        .string()
        .describe("Service type (Ground, Priority, Express, etc.)"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Purchasing shipment with carrier", {
          shipment_id: args.shipment_id,
          carrier: args.carrier,
          service: args.service,
        });

        const shipment = await easyPostClient.purchaseShipmentWithCarrier(
          args.shipment_id,
          args.carrier,
          args.service,
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/shipments/purchase",
          duration,
          200,
        );

        logger.info(`Purchased shipment ${shipment.id} in ${duration}ms`);
        const result = {
          ...shipment,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/shipments/purchase",
          duration,
          500,
          true,
        );
        logError("Failed to purchase shipment", error);
        throw new Error(`Failed to purchase shipment: ${error.message}`);
      }
    },
  });

  /**
   * Get rates by ZIP codes (simplified)
   */
  server.addTool({
    name: "get_rates_by_zip",
    description: "Get shipping rates by ZIP codes (simplified method)",
    parameters: z.object({
      from_zip: z.string().describe("Origin ZIP code"),
      to_zip: z.string().describe("Destination ZIP code"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Getting rates by ZIP codes", {
          from_zip: args.from_zip,
          to_zip: args.to_zip,
        });

        const rates = await easyPostClient.getRatesByZip(
          args.from_zip,
          args.to_zip,
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall("easypost", "/rates/by-zip", duration, 200);

        logger.info(`Found ${rates.length} rates by ZIP in ${duration}ms`);
        const result = {
          rates,
          count: rates.length,
          from_zip: args.from_zip,
          to_zip: args.to_zip,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall(
          "easypost",
          "/rates/by-zip",
          duration,
          500,
          true,
        );
        logError("Failed to get rates by ZIP", error);
        throw new Error(`Failed to get rates by ZIP: ${error.message}`);
      }
    },
  });

  /**
   * Track a package (alias for trackShipment)
   */
  server.addTool({
    name: "track_package",
    description:
      "Track a package using tracking code (alias for trackShipment)",
    parameters: z.object({
      tracking_code: z.string().describe("Tracking number or code"),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      const apiHandler = createApiHandler(
        "easypost",
        "/trackers/package",
        "track package",
      );

      try {
        logger.info("Tracking package", {
          tracking_code: args.tracking_code,
        });

        const trackingInfo = await easyPostClient.trackPackage(
          args.tracking_code,
        );
        monitoring.recordApiCall(
          "easypost",
          "/trackers/package",
          Date.now() - startTime,
          200,
        );

        logger.info(
          `Retrieved package tracking info for ${args.tracking_code} in ${Date.now() - startTime}ms`,
        );
        return apiHandler.success(trackingInfo, startTime);
      } catch (error: any) {
        apiHandler.error(error, startTime);
        throw new Error(`Package tracking failed: ${error.message}`);
      }
    },
  });

  /**
   * Verify and normalize an address
   */
  server.addTool({
    name: "verify_address",
    description: "Verify and normalize a shipping address",
    parameters: z.object({
      address: addressSchema,
    }),
    execute: async (args) => {
      const startTime = Date.now();
      const apiHandler = createApiHandler(
        "easypost",
        "/addresses/verify",
        "verify address",
      );

      try {
        logger.info("Verifying address", {
          city: args.address.city,
          state: args.address.state,
          zip: args.address.zip,
        });

        const verifiedAddress = await easyPostClient.verifyAddress(
          args.address as EasyPostAddress,
        );
        monitoring.recordApiCall(
          "easypost",
          "/addresses/verify",
          Date.now() - startTime,
          200,
        );

        logger.info(`Verified address in ${Date.now() - startTime}ms`);
        return apiHandler.success(verifiedAddress, startTime);
      } catch (error: any) {
        apiHandler.error(error, startTime);
        throw new Error(`Address verification failed: ${error.message}`);
      }
    },
  });
}
