/**
 * API Tools Index
 * Exports all available MCP tools for the unified EasyPost-Veeqo server
 */

// EasyPost Tools
export { health } from './health.js';
export { parcelPresets } from './parcel-presets.js';
// export { createShipment } from './create-shipment.js';
// export { trackShipment } from './track-shipment.js';
// export { getShippingRates } from './get-shipping-rates.js';
export { verifyAddress } from './verify-address.js';

// Veeqo Tools
// export { getInventory } from './get-inventory.js';
// export { updateStock } from './update-stock.js';
// export { getOrders } from './get-orders.js';
// export { createOrder } from './create-order.js';

// Unified Tools
// export { optimizeShipping } from './optimize-shipping.js';
// export { forecastDemand } from './forecast-demand.js';
// export { analyzeShippingPatterns } from './analyze-shipping-patterns.js';

// Tool metadata for MCP registration
export const TOOL_DEFINITIONS = [
  'health',
  'parcelPresets',
  'verifyAddress',
  // 'createShipment',
  // 'trackShipment',
  // 'getShippingRates',
  // 'getInventory',
  // 'updateStock',
  // 'getOrders',
  // 'createOrder',
  // 'optimizeShipping',
  // 'forecastDemand',
  // 'analyzeShippingPatterns',
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number];
