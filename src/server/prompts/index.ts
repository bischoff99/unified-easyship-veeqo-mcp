/**
 * MCP Prompts Module
 * Contains intelligent prompts that orchestrate multiple tools for complex workflows
 */

import type { FastMCP } from "fastmcp";
import { EasyPostClient } from "../../services/clients/easypost-enhanced.js";
import { VeeqoClient } from "../../services/clients/veeqo-enhanced.js";
import { safeLogger as logger } from "../../utils/type-safe-logger.js";
import { addOrderProcessingPrompt } from "./order-processor.js";

export function addPromptTools(
  server: FastMCP,
  easyPostClient: EasyPostClient,
  veeqoClient: VeeqoClient,
) {
  // Add the focused order processing prompt
  addOrderProcessingPrompt(server, easyPostClient, veeqoClient);

  logger.info("Prompt tools loaded successfully");
}
