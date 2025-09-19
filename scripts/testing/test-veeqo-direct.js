#!/usr/bin/env node

/**
 * Test Veeqo API Direct Connection - READ ONLY
 * Tests Veeqo API directly without MCP server
 */

import { VeeqoClient } from "./dist/services/clients/veeqo-enhanced.js";

async function testVeeqoDirect() {
  console.log("📦 Testing Veeqo API Direct Connection - READ ONLY\n");

  const client = new VeeqoClient();

  try {
    // Test 1: Get locations (read-only)
    console.log("1. Testing Get Locations...");
    try {
      const locations = await client.getLocations();
      console.log(`   ✅ Success: Found ${locations.length} locations`);
      if (locations.length > 0) {
        console.log(
          `   📍 First location: ${locations[0].name} (ID: ${locations[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 2: Get products (read-only)
    console.log("2. Testing Get Products...");
    try {
      const products = await client.getProducts();
      console.log(`   ✅ Success: Found ${products.length} products`);
      if (products.length > 0) {
        console.log(
          `   📦 First product: ${products[0].title} (ID: ${products[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 3: Get orders (read-only)
    console.log("3. Testing Get Orders...");
    try {
      const orders = await client.getOrders();
      console.log(`   ✅ Success: Found ${orders.length} orders`);
      if (orders.length > 0) {
        console.log(
          `   📋 First order: #${orders[0].order_number} (ID: ${orders[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 4: Get inventory levels (read-only)
    console.log("4. Testing Get Inventory Levels...");
    try {
      const inventory = await client.getInventoryLevels();
      console.log(`   ✅ Success: Found ${inventory.length} inventory records`);
      if (inventory.length > 0) {
        console.log(
          `   📊 First inventory: Product ${inventory[0].product_id} at Location ${inventory[0].location_id}`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 5: Get customers (read-only)
    console.log("5. Testing Get Customers...");
    try {
      const customers = await client.getCustomers();
      console.log(`   ✅ Success: Found ${customers.length} customers`);
      if (customers.length > 0) {
        console.log(
          `   👤 First customer: ${customers[0].first_name} ${customers[0].last_name} (ID: ${customers[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 6: Get suppliers (read-only)
    console.log("6. Testing Get Suppliers...");
    try {
      const suppliers = await client.getSuppliers();
      console.log(`   ✅ Success: Found ${suppliers.length} suppliers`);
      if (suppliers.length > 0) {
        console.log(
          `   🏭 First supplier: ${suppliers[0].name} (ID: ${suppliers[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 7: Get shipping methods (read-only)
    console.log("7. Testing Get Shipping Methods...");
    try {
      const shippingMethods = await client.getShippingMethods();
      console.log(
        `   ✅ Success: Found ${shippingMethods.length} shipping methods`,
      );
      if (shippingMethods.length > 0) {
        console.log(
          `   🚚 First shipping method: ${shippingMethods[0].name} (ID: ${shippingMethods[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(50) + "\n");

    // Test 8: Get warehouses (read-only)
    console.log("8. Testing Get Warehouses...");
    try {
      const warehouses = await client.getWarehouses();
      console.log(`   ✅ Success: Found ${warehouses.length} warehouses`);
      if (warehouses.length > 0) {
        console.log(
          `   🏢 First warehouse: ${warehouses[0].name} (ID: ${warehouses[0].id})`,
        );
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ General Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Veeqo API Direct Connection Test Completed!");
  console.log("📋 Summary:");
  console.log("   - All tests are READ ONLY (no purchases or modifications)");
  console.log("   - Tests show available data in your Veeqo account");
  console.log("   - Some tests may fail if no data exists (this is normal)");
  console.log("   - No inventory will be updated or orders created");
  console.log("   - API key is working if you see successful responses");
}

// Run the test
testVeeqoDirect().catch(console.error);
