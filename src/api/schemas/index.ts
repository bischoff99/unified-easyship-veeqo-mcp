/**
 * API Schemas Index
 * Zod validation schemas for all API operations
 */

import { z } from "zod";

// Common schemas
// Import AddressSchema from the canonical location
import { AddressSchema, type Address } from "./address";
export { AddressSchema, type Address };

export const ParcelSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  weight: z.number().positive(),
});

// EasyPost schemas
export const CreateShipmentSchema = z.object({
  from_address: AddressSchema,
  to_address: AddressSchema,
  parcel: ParcelSchema,
  service: z.string().optional(),
});

export const TrackShipmentSchema = z.object({
  tracking_code: z.string(),
  carrier: z.string().optional(),
});

export const GetRatesSchema = z.object({
  from_address: AddressSchema,
  to_address: AddressSchema,
  parcel: ParcelSchema,
});

// Veeqo schemas
export const GetInventorySchema = z.object({
  product_id: z.string().optional(),
  sku: z.string().optional(),
  warehouse_id: z.string().optional(),
});

export const UpdateStockSchema = z.object({
  product_id: z.string(),
  warehouse_id: z.string(),
  quantity: z.number().int(),
  reason: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  customer_id: z.string(),
  items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    }),
  ),
  shipping_address: AddressSchema,
  billing_address: AddressSchema.optional(),
});

// AI/Optimization schemas
export const OptimizeShippingSchema = z.object({
  shipments: z.array(
    z.object({
      from_address: AddressSchema,
      to_address: AddressSchema,
      parcel: ParcelSchema,
      priority: z
        .enum(["standard", "expedited", "overnight"])
        .default("standard"),
    }),
  ),
  preferences: z
    .object({
      cost_weight: z.number().min(0).max(1).default(0.7),
      speed_weight: z.number().min(0).max(1).default(0.3),
      carrier_preferences: z.array(z.string()).optional(),
    })
    .optional(),
});

export const ForecastDemandSchema = z.object({
  product_ids: z.array(z.string()),
  forecast_days: z.number().int().positive().default(30),
  include_seasonality: z.boolean().default(true),
});

// Export all schemas as a collection
export const API_SCHEMAS = {
  Address: AddressSchema,
  Parcel: ParcelSchema,
  CreateShipment: CreateShipmentSchema,
  TrackShipment: TrackShipmentSchema,
  GetRates: GetRatesSchema,
  GetInventory: GetInventorySchema,
  UpdateStock: UpdateStockSchema,
  CreateOrder: CreateOrderSchema,
  OptimizeShipping: OptimizeShippingSchema,
  ForecastDemand: ForecastDemandSchema,
} as const;

// Type exports
export type Parcel = z.infer<typeof ParcelSchema>;
export type CreateShipmentRequest = z.infer<typeof CreateShipmentSchema>;
export type TrackShipmentRequest = z.infer<typeof TrackShipmentSchema>;
export type GetRatesRequest = z.infer<typeof GetRatesSchema>;
export type GetInventoryRequest = z.infer<typeof GetInventorySchema>;
export type UpdateStockRequest = z.infer<typeof UpdateStockSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type OptimizeShippingRequest = z.infer<typeof OptimizeShippingSchema>;
export type ForecastDemandRequest = z.infer<typeof ForecastDemandSchema>;
