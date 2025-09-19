#!/usr/bin/env node

/**
 * Documentation generation script for FastMCP server
 * Generates comprehensive API documentation, tool schemas, and usage examples
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

/**
 * Extract tool documentation from FastMCP server file
 */
async function extractToolDocs() {
  console.log("📋 Extracting tool documentation...");

  const serverFile = path.join(projectRoot, "src/server/fastmcp-server.ts");
  const content = await fs.readFile(serverFile, "utf-8");

  const tools = [];
  const toolPattern = /server\.addTool\(\{[\s\S]*?\}\);/g;
  const matches = content.match(toolPattern) || [];

  for (const match of matches) {
    const nameMatch = match.match(/name:\s*['"`]([^'"`]+)['"`]/);
    const descMatch = match.match(/description:\s*['"`]([^'"`]+)['"`]/);
    const parametersMatch = match.match(
      /parameters:\s*(z\.object\(\{[\s\S]*?\}\))/,
    );

    if (nameMatch && descMatch) {
      tools.push({
        name: nameMatch[1],
        description: descMatch[1],
        parameters: parametersMatch
          ? parametersMatch[1]
          : "No parameters documented",
        category: getToolCategory(nameMatch[1]),
      });
    }
  }

  console.log(`✅ Extracted ${tools.length} tools`);
  return tools;
}

/**
 * Extract resource template documentation
 */
async function extractResourceDocs() {
  console.log("📋 Extracting resource documentation...");

  const serverFile = path.join(projectRoot, "src/server/fastmcp-server.ts");
  const content = await fs.readFile(serverFile, "utf-8");

  const resources = [];
  const resourcePattern = /server\.addResourceTemplate\(\{[\s\S]*?\}\);/g;
  const matches = content.match(resourcePattern) || [];

  for (const match of matches) {
    const uriMatch = match.match(/uriTemplate:\s*['"`]([^'"`]+)['"`]/);
    const nameMatch = match.match(/name:\s*['"`]([^'"`]+)['"`]/);
    const mimeMatch = match.match(/mimeType:\s*['"`]([^'"`]+)['"`]/);

    if (uriMatch && nameMatch) {
      resources.push({
        uriTemplate: uriMatch[1],
        name: nameMatch[1],
        mimeType: mimeMatch ? mimeMatch[1] : "application/json",
      });
    }
  }

  console.log(`✅ Extracted ${resources.length} resources`);
  return resources;
}

/**
 * Extract prompt documentation
 */
async function extractPromptDocs() {
  console.log("📋 Extracting prompt documentation...");

  const serverFile = path.join(projectRoot, "src/server/fastmcp-server.ts");
  const content = await fs.readFile(serverFile, "utf-8");

  const prompts = [];
  const promptPattern = /server\.addPrompt\(\{[\s\S]*?\}\);/g;
  const matches = content.match(promptPattern) || [];

  for (const match of matches) {
    const nameMatch = match.match(/name:\s*['"`]([^'"`]+)['"`]/);
    const descMatch = match.match(/description:\s*['"`]([^'"`]+)['"`]/);

    if (nameMatch && descMatch) {
      prompts.push({
        name: nameMatch[1],
        description: descMatch[1],
      });
    }
  }

  console.log(`✅ Extracted ${prompts.length} prompts`);
  return prompts;
}

/**
 * Generate tool reference documentation
 */
async function generateToolReference(tools) {
  console.log("📝 Generating tool reference...");

  const categorizedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {});

  let markdown = `# FastMCP Tool Reference

This document provides comprehensive reference documentation for all tools available in the Unified EasyPost-Veeqo MCP Server.

## Table of Contents

`;

  // Generate table of contents
  for (const [category, categoryTools] of Object.entries(categorizedTools)) {
    markdown += `- [${category}](#${category.toLowerCase().replace(/\s+/g, "-")})\n`;
    for (const tool of categoryTools) {
      markdown += `  - [${tool.name}](#${tool.name.replace(/_/g, "-")})\n`;
    }
  }

  markdown += "\n---\n\n";

  // Generate tool documentation
  for (const [category, categoryTools] of Object.entries(categorizedTools)) {
    markdown += `## ${category}\n\n`;

    for (const tool of categoryTools) {
      markdown += `### ${tool.name}\n\n`;
      markdown += `${tool.description}\n\n`;
      markdown += `**Parameters:**\n\`\`\`typescript\n${tool.parameters}\n\`\`\`\n\n`;

      // Add usage example
      markdown += `**Example Usage:**\n\`\`\`json\n`;
      markdown += generateToolExample(tool.name);
      markdown += `\n\`\`\`\n\n`;

      markdown += "---\n\n";
    }
  }

  const outputPath = path.join(projectRoot, "docs/tool-reference.md");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown);

  console.log(`✅ Generated tool reference at ${outputPath}`);
}

/**
 * Generate API documentation
 */
async function generateApiDocs() {
  console.log("📝 Generating API documentation...");

  const markdown = `# API Documentation

## Overview

The Unified EasyPost-Veeqo MCP Server provides a comprehensive set of tools for shipping operations, inventory management, and AI-powered optimization through the Model Context Protocol (MCP).

## Base Configuration

### Server Information
- **Name**: unified-easyship-veeqo-mcp
- **Version**: 1.0.0
- **Protocol**: MCP (Model Context Protocol)
- **Transport**: stdio

### Authentication
The server requires API keys for external services:
- \`EASYPOST_API_KEY\`: EasyPost API key for shipping operations
- \`VEEQO_API_KEY\`: Veeqo API key for inventory management

## MCP Protocol Methods

### initialize
Initialize the MCP server connection.

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "clientInfo": {
      "name": "your-client",
      "version": "1.0.0"
    }
  }
}
\`\`\`

### tools/list
List all available tools.

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
\`\`\`

### tools/call
Execute a specific tool.

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "calculate_shipping_rates",
    "arguments": {
      "from_address": { /* address object */ },
      "to_address": { /* address object */ },
      "parcel": { /* parcel object */ }
    }
  }
}
\`\`\`

## Error Handling

All tools implement comprehensive error handling with descriptive error messages:

\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32603,
    "message": "Failed to calculate shipping rates: Invalid ZIP code format"
  }
}
\`\`\`

## Performance Considerations

- All long-running operations support streaming responses
- Progress reporting is available for operations that may take time
- Automatic retry logic with exponential backoff for API calls
- Built-in rate limiting and timeout handling

## Integration Examples

See the [Integration Guide](./integration-guide.md) for comprehensive examples of using the server with popular MCP clients.
`;

  const outputPath = path.join(projectRoot, "docs/api-documentation.md");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown);

  console.log(`✅ Generated API documentation at ${outputPath}`);
}

/**
 * Generate integration guide
 */
async function generateIntegrationGuide() {
  console.log("📝 Generating integration guide...");

  const markdown = `# Integration Guide

## Claude Desktop Integration

### 1. Installation

Add the server to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "unified-easyship-veeqo": {
      "command": "node",
      "args": ["/path/to/your/server/dist/server/fastmcp-server.js"],
      "env": {
        "EASYPOST_API_KEY": "your_easypost_api_key",
        "VEEQO_API_KEY": "your_veeqo_api_key",
        "LOG_LEVEL": "info"
      }
    }
  }
}
\`\`\`

### 2. Basic Usage Examples

#### Calculate Shipping Rates
\`\`\`
Can you help me calculate shipping rates from San Francisco, CA to New York, NY for a 2lb package?
\`\`\`

#### Create Shipping Labels
\`\`\`
I need to create a UPS Ground shipping label for this order. The package weighs 1.5 lbs and measures 12x9x6 inches.
\`\`\`

#### Check Inventory Levels
\`\`\`
What are the current inventory levels for product ID 12345 across all warehouses?
\`\`\`

#### AI-Powered Optimization
\`\`\`
Can you optimize shipping for a fragile 3lb package going from Los Angeles to Boston with a $20 budget and 2-day delivery requirement?
\`\`\`

## VSCode with MCP Extension

### Setup
1. Install the MCP extension for VSCode
2. Add server configuration to settings.json:

\`\`\`json
{
  "mcp.servers": {
    "unified-easyship-veeqo": {
      "command": "node",
      "args": ["dist/server/fastmcp-server.js"],
      "cwd": "/path/to/server",
      "env": {
        "EASYPOST_API_KEY": "your_key",
        "VEEQO_API_KEY": "your_key"
      }
    }
  }
}
\`\`\`

## Custom Integration

### Node.js Client Example

\`\`\`javascript
import { MCPClient } from '@anthropic-ai/mcp-client';
import { StdioClientTransport } from '@anthropic-ai/mcp-client/stdio';

async function createMCPClient() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server/fastmcp-server.js'],
    env: {
      EASYPOST_API_KEY: process.env.EASYPOST_API_KEY,
      VEEQO_API_KEY: process.env.VEEQO_API_KEY,
    },
  });
  
  const client = new MCPClient({ transport });
  await client.initialize();
  
  return client;
}

// Calculate shipping rates
async function getShippingRates() {
  const client = await createMCPClient();
  
  const result = await client.callTool('calculate_shipping_rates', {
    from_address: {
      name: 'Sender Name',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'US',
    },
    to_address: {
      name: 'Recipient Name',
      street1: '456 Oak Ave',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    parcel: {
      length: 12,
      width: 9,
      height: 6,
      weight: 16, // in oz
    },
  });
  
  console.log(result.content[0].text);
}
\`\`\`

## Environment Configuration

### Required Environment Variables
- \`EASYPOST_API_KEY\`: Your EasyPost API key
- \`VEEQO_API_KEY\`: Your Veeqo API key

### Optional Environment Variables
- \`LOG_LEVEL\`: Logging level (debug, info, warn, error) - default: info
- \`NODE_ENV\`: Environment mode (development, production, test) - default: development

### Development vs Production

#### Development
\`\`\`bash
export NODE_ENV=development
export LOG_LEVEL=debug
export EASYPOST_API_KEY=test_key  # Use test keys for development
export VEEQO_API_KEY=test_key
\`\`\`

#### Production
\`\`\`bash
export NODE_ENV=production
export LOG_LEVEL=warn
export EASYPOST_API_KEY=live_key  # Use live keys for production
export VEEQO_API_KEY=live_key
\`\`\`

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check that Node.js version is 20 or higher
   - Verify API keys are valid and active
   - Ensure server build is up to date (\`npm run build\`)

2. **API Rate Limits**
   - The server implements automatic retry with exponential backoff
   - Consider upgrading your API plan if hitting rate limits frequently

3. **Memory Issues**
   - Monitor memory usage with the built-in performance monitoring
   - Consider processing large operations in smaller batches

### Debug Mode
Enable debug logging for detailed troubleshooting:

\`\`\`bash
LOG_LEVEL=debug node dist/server/fastmcp-server.js
\`\`\`

### Health Checks
The server provides health check endpoints:
- Use the \`health\` tool to check server status
- Performance metrics are available through the monitoring tools
`;

  const outputPath = path.join(projectRoot, "docs/integration-guide.md");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown);

  console.log(`✅ Generated integration guide at ${outputPath}`);
}

/**
 * Generate schema documentation
 */
async function generateSchemaDocs() {
  console.log("📝 Generating schema documentation...");

  const markdown = `# Schema Documentation

## Common Types

### Address Schema
\`\`\`typescript
interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string; // default: "US"
  phone?: string;
  email?: string;
}
\`\`\`

### Parcel Schema
\`\`\`typescript
interface Parcel {
  length: number;  // in inches
  width: number;   // in inches  
  height: number;  // in inches
  weight: number;  // in ounces
}
\`\`\`

### Shipping Rate Schema
\`\`\`typescript
interface ShippingRate {
  carrier: string;
  service: string;
  rate: string;           // price as string
  delivery_days: number | null;
  delivery_date?: string;
}
\`\`\`

## Tool-Specific Schemas

### Rate Selection Criteria
\`\`\`typescript
interface SelectionCriteria {
  priority: 'cost' | 'speed' | 'reliability' | 'balanced';
  max_cost?: number;
  max_delivery_days?: number;
  preferred_carriers?: string[];
  exclude_carriers?: string[];
}
\`\`\`

### Inventory Update Schema
\`\`\`typescript
interface InventoryUpdate {
  product_id: string;
  location_id: string;
  quantity: number;
  reason?: string;
}
\`\`\`

### Order Fulfillment Schema
\`\`\`typescript
interface FulfillmentDetails {
  location_id: string;
  tracking_number?: string;
  carrier?: string;
  service?: string;
  shipped_items: Array<{
    line_item_id: string;
    quantity: number;
  }>;
}
\`\`\`

## Validation Rules

### Address Validation
- \`name\`: Required, 1-100 characters
- \`street1\`: Required, 1-200 characters
- \`city\`: Required, 1-100 characters
- \`state\`: Required, 2 characters (US state codes)
- \`zip\`: Required, 5 or 9 digits (US ZIP codes)
- \`country\`: ISO 3166-1 alpha-2 country code

### Parcel Validation
- All dimensions must be > 0
- Weight must be > 0
- Maximum dimensions: 108 inches combined length + girth
- Maximum weight: 150 lbs (2400 oz)

### Error Response Schema
\`\`\`typescript
interface ErrorResponse {
  jsonrpc: "2.0";
  id: number | string;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}
\`\`\`

## Example Payloads

### Calculate Shipping Rates Request
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculate_shipping_rates",
    "arguments": {
      "from_address": {
        "name": "John Doe",
        "street1": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94105",
        "country": "US"
      },
      "to_address": {
        "name": "Jane Smith",
        "street1": "456 Oak Ave",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "country": "US"
      },
      "parcel": {
        "length": 12,
        "width": 9,
        "height": 6,
        "weight": 16
      },
      "carriers": ["USPS", "UPS", "FedEx"]
    }
  }
}
\`\`\`

### Successful Tool Response
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Shipping Rates for San Francisco, CA to New York, NY:\\n\\nUSPS Priority: $8.15 (2 days)\\nUPS Ground: $7.89 (3 days)\\nFedEx Express Saver: $12.45 (1 days)"
      }
    ]
  }
}
\`\`\`
`;

  const outputPath = path.join(projectRoot, "docs/schema-documentation.md");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown);

  console.log(`✅ Generated schema documentation at ${outputPath}`);
}

/**
 * Helper functions
 */
function getToolCategory(toolName) {
  if (
    toolName.includes("shipping") ||
    toolName.includes("rate") ||
    toolName.includes("label") ||
    toolName.includes("track")
  ) {
    return "Shipping Tools";
  } else if (
    toolName.includes("inventory") ||
    toolName.includes("stock") ||
    toolName.includes("fulfill") ||
    toolName.includes("order")
  ) {
    return "Inventory Tools";
  } else if (
    toolName.includes("optimize") ||
    toolName.includes("analyze") ||
    toolName.includes("ai")
  ) {
    return "AI-Powered Tools";
  } else if (toolName.includes("address") || toolName.includes("validate")) {
    return "Validation Tools";
  } else {
    return "Utility Tools";
  }
}

function generateToolExample(toolName) {
  const examples = {
    calculate_shipping_rates: JSON.stringify(
      {
        from_address: {
          name: "John Doe",
          street1: "123 Main St",
          city: "San Francisco",
          state: "CA",
          zip: "94105",
          country: "US",
        },
        to_address: {
          name: "Jane Smith",
          street1: "456 Oak Ave",
          city: "New York",
          state: "NY",
          zip: "10001",
          country: "US",
        },
        parcel: {
          length: 12,
          width: 9,
          height: 6,
          weight: 16,
        },
      },
      null,
      2,
    ),
    get_inventory_levels: JSON.stringify(
      {
        product_ids: ["12345", "67890"],
        location_ids: ["339686"],
      },
      null,
      2,
    ),
  };

  return (
    examples[toolName] ||
    JSON.stringify({ example: "Example not available" }, null, 2)
  );
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Starting documentation generation...");

  try {
    // Extract documentation from source code
    const tools = await extractToolDocs();
    const resources = await extractResourceDocs();
    const prompts = await extractPromptDocs();

    // Generate documentation files
    await generateToolReference(tools);
    await generateApiDocs();
    await generateIntegrationGuide();
    await generateSchemaDocs();

    // Create index file
    const indexContent = `# Documentation Index

## API Documentation
- [API Documentation](./api-documentation.md) - Complete API reference
- [Tool Reference](./tool-reference.md) - All available tools
- [Schema Documentation](./schema-documentation.md) - Data schemas and validation

## Integration
- [Integration Guide](./integration-guide.md) - Setup and usage examples

## Generated Documentation
- [JSDoc API](./api/) - Detailed code documentation

---

Generated on ${new Date().toISOString()}
- Tools documented: ${tools.length}
- Resources documented: ${resources.length}  
- Prompts documented: ${prompts.length}
`;

    const indexPath = path.join(projectRoot, "docs/README.md");
    await fs.writeFile(indexPath, indexContent);

    console.log("✅ Documentation generation completed successfully!");
    console.log("📁 Documentation available in ./docs/");
  } catch (error) {
    console.error("❌ Documentation generation failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
