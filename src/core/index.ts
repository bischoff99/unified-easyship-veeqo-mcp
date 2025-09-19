/**
 * Core Module Index
 * Exports core server functionality and types
 */

// Core server components (legacy server archived)
// export { default as McpServer } from './server.js';
export { EasyPostClient } from "./client.js";
export * from "./types.js";

// Error handling (now from utils)
export { createError, ErrorCode } from "../utils/errors.js";

// Tools
export * from "./tools/index.js";

// Constants
export const SERVER_VERSION = "1.0.0";
export const SUPPORTED_PROTOCOLS = ["json-rpc-2.0"] as const;
export const DEFAULT_TIMEOUT = 30000;

// Server configuration
export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  timeout?: number;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  name: "unified_easyship_veeqo_mcp",
  version: SERVER_VERSION,
  description:
    "Unified MCP server for EasyPost and Veeqo shipping, inventory, and orchestration",
  timeout: DEFAULT_TIMEOUT,
};
