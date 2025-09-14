/**
 * Shipping Tools Module for FastMCP Server
 * Contains all shipping-related tools and functionality
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { EasyPostClient, type EasyPostAddress } from '../../services/clients/easypost-enhanced.js';
import { logError, logger } from '../../utils/logger.js';
import { monitoring } from '../../utils/monitoring.js';

export function addShippingTools(server: FastMCP, easyPostClient: EasyPostClient) {
  // Address validation schema
  const addressSchema = z.object({
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
  });

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
    name: 'calculate_shipping_rates',
    description: 'Calculate shipping rates from multiple carriers for a package',
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      service_types: z.array(z.string()).optional().describe('Optional array of specific service types to filter'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Calculating shipping rates', {
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
          weight: args.parcel.weight,
        });

        const rates = await easyPostClient.getRates(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel
        );

        // Filter by service types if provided
        const filteredRates = args.service_types
          ? rates.filter(rate => args.service_types!.includes(rate.service))
          : rates;

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/rates', duration, 200);

        logger.info(`Found ${filteredRates.length} shipping rates in ${duration}ms`);
        return {
          rates: filteredRates,
          count: filteredRates.length,
          processing_time_ms: duration,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/rates', duration, 500, true);
        logError('Failed to calculate shipping rates', error);
        throw new Error(`Shipping rate calculation failed: ${error.message}`);
      }
    },
  });

  /**
   * Create shipping label
   */
  server.addTool({
    name: 'create_shipping_label',
    description: 'Create a shipping label for a package',
    parameters: z.object({
      from_address: addressSchema,
      to_address: addressSchema,
      parcel: parcelSchema,
      service: z.string().describe('Shipping service (e.g., "Ground", "Priority", "Express")'),
      carrier: z.string().describe('Shipping carrier (e.g., "USPS", "UPS", "FedEx")'),
      reference: z.string().optional().describe('Optional reference number for tracking'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Creating shipping label', {
          carrier: args.carrier,
          service: args.service,
          from: `${args.from_address.city}, ${args.from_address.state}`,
          to: `${args.to_address.city}, ${args.to_address.state}`,
        });

        const label = await easyPostClient.createShipment(
          args.from_address as EasyPostAddress,
          args.to_address as EasyPostAddress,
          args.parcel,
          { service: args.service, carrier: args.carrier }
        );

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/shipments', duration, 200);

        logger.info(`Created shipping label ${label.tracking_code} in ${duration}ms`);
        return {
          ...label,
          processing_time_ms: duration,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/shipments', duration, 500, true);
        logError('Failed to create shipping label', error);
        throw new Error(`Label creation failed: ${error.message}`);
      }
    },
  });

  /**
   * Track shipment status
   */
  server.addTool({
    name: 'track_shipment',
    description: 'Track the status and location of a shipment',
    parameters: z.object({
      tracking_code: z.string().describe('Tracking number or code'),
      carrier: z.string().optional().describe('Carrier name (optional, helps with accuracy)'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Tracking shipment', {
          tracking_code: args.tracking_code,
          carrier: args.carrier,
        });

        const trackingInfo = await easyPostClient.trackPackage(args.tracking_code);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/trackers', duration, 200);

        logger.info(`Retrieved tracking info for ${args.tracking_code} in ${duration}ms`);
        return {
          ...trackingInfo,
          processing_time_ms: duration,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/trackers', duration, 500, true);
        logError('Failed to track shipment', error);
        throw new Error(`Shipment tracking failed: ${error.message}`);
      }
    },
  });

  /**
   * Validate and normalize addresses
   */
  server.addTool({
    name: 'validate_address',
    description: 'Validate and normalize a shipping address',
    parameters: z.object({
      address: addressSchema,
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Validating address', {
          city: args.address.city,
          state: args.address.state,
          zip: args.address.zip,
        });

        const validatedAddress = await easyPostClient.verifyAddress(args.address as EasyPostAddress);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/addresses/verify', duration, 200);

        logger.info(`Validated address in ${duration}ms`);
        return {
          ...validatedAddress,
          processing_time_ms: duration,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/addresses/verify', duration, 500, true);
        logError('Failed to validate address', error);
        throw new Error(`Address validation failed: ${error.message}`);
      }
    },
  });

  /**
   * Get parcel presets for common package types
   */
  server.addTool({
    name: 'get_parcel_presets',
    description: 'Get predefined parcel dimensions for common package types',
    parameters: z.object({
      carrier: z.string().optional().describe('Filter by specific carrier (USPS, UPS, FedEx)'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Fetching parcel presets', { carrier: args.carrier });

        const presets = await easyPostClient.getParcelPresets(args.carrier);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/parcel_presets', duration, 200);

        logger.info(`Retrieved ${presets.length} parcel presets in ${duration}ms`);
        return {
          presets,
          count: presets.length,
          processing_time_ms: duration,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/parcel_presets', duration, 500, true);
        logError('Failed to get parcel presets', error);
        throw new Error(`Failed to retrieve parcel presets: ${error.message}`);
      }
    },
  });
}