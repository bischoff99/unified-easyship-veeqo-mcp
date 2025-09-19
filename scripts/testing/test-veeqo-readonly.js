#!/usr/bin/env node

/**
 * Test Veeqo Integration - READ ONLY
 * Tests Veeqo API without making any purchases or modifications
 */

import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testVeeqoReadOnly() {
  console.log("📦 Testing Veeqo Integration - READ ONLY MODE\n");

  const serverPath = join(__dirname, "dist/server/fastmcp-server.js");

  // Test 1: Get inventory levels (read-only)
  console.log("1. Testing Get Inventory Levels (READ ONLY)...");
  await testMCPTool("get_inventory_levels", {
    // No parameters needed - will get all inventory
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 2: Get locations (read-only)
  console.log("2. Testing Get Locations (READ ONLY)...");
  await testMCPTool("get_locations", {
    // No parameters needed - will get all locations
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 3: Get products (read-only)
  console.log("3. Testing Get Products (READ ONLY)...");
  await testMCPTool("get_products", {
    // No parameters needed - will get all products
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 4: Get orders (read-only)
  console.log("4. Testing Get Orders (READ ONLY)...");
  await testMCPTool("get_orders", {
    // No parameters needed - will get recent orders
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 5: Get specific order (if we have an order ID)
  console.log("5. Testing Get Specific Order (READ ONLY)...");
  console.log(
    "   Note: This will only work if you have existing orders in Veeqo",
  );
  await testMCPTool("get_order", {
    order_id: "1", // Try with order ID 1, will fail gracefully if doesn't exist
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 6: Get product inventory (read-only)
  console.log("6. Testing Get Product Inventory (READ ONLY)...");
  console.log("   Note: This will only work if you have products in Veeqo");
  await testMCPTool("get_product_inventory", {
    product_id: "1", // Try with product ID 1, will fail gracefully if doesn't exist
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 7: Get shipping methods (read-only)
  console.log("7. Testing Get Shipping Methods (READ ONLY)...");
  await testMCPTool("get_shipping_methods", {
    // No parameters needed - will get all shipping methods
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 8: Get warehouses (read-only)
  console.log("8. Testing Get Warehouses (READ ONLY)...");
  await testMCPTool("get_warehouses", {
    // No parameters needed - will get all warehouses
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 9: Get customers (read-only)
  console.log("9. Testing Get Customers (READ ONLY)...");
  await testMCPTool("get_customers", {
    // No parameters needed - will get all customers
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 10: Get suppliers (read-only)
  console.log("10. Testing Get Suppliers (READ ONLY)...");
  await testMCPTool("get_suppliers", {
    // No parameters needed - will get all suppliers
  });

  console.log("\n" + "=".repeat(60) + "\n");

  console.log("✅ Veeqo READ ONLY tests completed!");
  console.log("📋 Summary:");
  console.log("   - All tests are READ ONLY (no purchases or modifications)");
  console.log("   - Tests will show available data in your Veeqo account");
  console.log("   - Some tests may fail if no data exists (this is normal)");
  console.log("   - No inventory will be updated or orders created");
}

async function testMCPTool(toolName, params) {
  return new Promise((resolve) => {
    const server = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    server.stdout.on("data", (data) => {
      output += data.toString();
    });

    server.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    server.on("close", (code) => {
      console.log(`   Tool: ${toolName}`);
      console.log(`   Parameters: ${JSON.stringify(params, null, 2)}`);
      console.log(`   Exit Code: ${code}`);

      if (output) {
        console.log(`   Output: ${output.trim()}`);
      }

      if (errorOutput) {
        console.log(`   Error: ${errorOutput.trim()}`);
      }

      resolve();
    });

    // Send the tool call
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params,
      },
    };

    server.stdin.write(JSON.stringify(request) + "\n");
    server.stdin.end();
  });
}

// Run the test
testVeeqoReadOnly().catch(console.error);
