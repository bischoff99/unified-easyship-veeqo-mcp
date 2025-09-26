/**
 * Simplified Tool Exports
 * Optimized for TypeScript language service stability
 */

// Core tools
export { health } from "./health.js";
export { parcelPresets } from "./parcel-presets.js";
export { verifyAddress } from "./verify-address.js";
export { weightToOz } from "./weight-to-oz.js";

// Simplified tool metadata
export const TOOL_NAMES = [
  "health",
  "parcelPresets", 
  "verifyAddress",
  "weightToOz",
  "shipping_operations",
  "weight_to_oz",
  "health_check",
  "get_parcel_presets",
  "verify_address",
  "optimize_shipping",
  "product_management",
  "inventory_management",
  "order_management",
  "warehouse_management",
  "customer_management",
  "supplier_management",
  "purchase_order_management",
  "inventory_reporting",
  "validate_fedex_order"
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
