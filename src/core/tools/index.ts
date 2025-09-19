/**
 * Core MCP Tools
 * Exports all available MCP tools for the unified EasyPost-Veeqo server
 */

// Core Tools
export { health } from "./health.js";
export { parcelPresets } from "./parcel-presets.js";
export { verifyAddress } from "./verify-address.js";
export { weightToOz } from "./weight-to-oz.js";
// optimizeShipping removed - AI integration disabled

// Tool metadata for MCP registration
export const TOOL_DEFINITIONS = [
  "health",
  "parcelPresets",
  "verifyAddress",
  "weightToOz",
  "optimizeShipping",
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number];
