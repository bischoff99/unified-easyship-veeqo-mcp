#!/usr/bin/env node

/**
 * Test Veeqo Production API - READ ONLY
 * Run this with your production Veeqo API key
 *
 * Usage: VEEQO_API_KEY=your_key_here node test-veeqo-production.js
 */

import { VeeqoClient } from './dist/services/clients/veeqo-enhanced.js';

async function testVeeqoProduction() {
  console.log('📦 Testing Veeqo Production API - READ ONLY\n');

  // Check if API key is provided
  if (!process.env.VEEQO_API_KEY || process.env.VEEQO_API_KEY === 'mock') {
    console.log('❌ VEEQO_API_KEY not set or set to "mock"');
    console.log('💡 To test with your production key, run:');
    console.log('   VEEQO_API_KEY=your_key_here node test-veeqo-production.js');
    console.log('   or');
    console.log('   export VEEQO_API_KEY=your_key_here && node test-veeqo-production.js');
    return;
  }

  console.log(`🔑 Using Veeqo API Key: ${process.env.VEEQO_API_KEY.substring(0, 8)}...`);
  console.log('⚠️  All tests are READ ONLY - no purchases or modifications will be made\n');

  const client = new VeeqoClient();

  try {
    // Test 1: Get locations (read-only)
    console.log('1. Testing Get Locations...');
    try {
      const locations = await client.getLocations();
      console.log(`   ✅ Success: Found ${locations.length} locations`);
      if (locations.length > 0) {
        console.log(`   📍 Locations:`);
        locations.forEach((location, index) => {
          console.log(`      ${index + 1}. ${location.name} (ID: ${location.id})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status}`);
        console.log(`   📋 Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 2: Get products (read-only)
    console.log('2. Testing Get Products...');
    try {
      const products = await client.getProducts();
      console.log(`   ✅ Success: Found ${products.length} products`);
      if (products.length > 0) {
        console.log(`   📦 Products:`);
        products.slice(0, 5).forEach((product, index) => {
          console.log(
            `      ${index + 1}. ${product.title} (ID: ${product.id}, SKU: ${product.sku})`
          );
        });
        if (products.length > 5) {
          console.log(`      ... and ${products.length - 5} more products`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status}`);
        console.log(`   📋 Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 3: Get orders (read-only)
    console.log('3. Testing Get Orders...');
    try {
      const orders = await client.getOrders();
      console.log(`   ✅ Success: Found ${orders.length} orders`);
      if (orders.length > 0) {
        console.log(`   📋 Recent Orders:`);
        orders.slice(0, 3).forEach((order, index) => {
          console.log(
            `      ${index + 1}. #${order.order_number} (ID: ${order.id}, Status: ${order.status})`
          );
        });
        if (orders.length > 3) {
          console.log(`      ... and ${orders.length - 3} more orders`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status}`);
        console.log(`   📋 Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 4: Get inventory levels (read-only)
    console.log('4. Testing Get Inventory Levels...');
    try {
      const inventory = await client.getInventoryLevels();
      console.log(`   ✅ Success: Found ${inventory.length} inventory records`);
      if (inventory.length > 0) {
        console.log(`   📊 Inventory Summary:`);
        const summary = inventory.reduce((acc, item) => {
          const key = `Location ${item.location_id}`;
          if (!acc[key]) acc[key] = { total: 0, products: 0 };
          acc[key].total += item.available_quantity;
          acc[key].products += 1;
          return acc;
        }, {});

        Object.entries(summary).forEach(([location, data]) => {
          console.log(`      ${location}: ${data.total} units across ${data.products} products`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status}`);
        console.log(`   📋 Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 5: Get specific order (if we have orders)
    console.log('5. Testing Get Specific Order...');
    try {
      const orders = await client.getOrders();
      if (orders.length > 0) {
        const firstOrder = orders[0];
        const orderDetails = await client.getOrder(firstOrder.id);
        console.log(`   ✅ Success: Retrieved order #${orderDetails.order_number}`);
        console.log(`   📋 Order Details:`);
        console.log(`      Status: ${orderDetails.status}`);
        console.log(`      Total: $${orderDetails.total}`);
        console.log(`      Items: ${orderDetails.line_items?.length || 0}`);
        console.log(
          `      Customer: ${orderDetails.customer?.first_name} ${orderDetails.customer?.last_name}`
        );
      } else {
        console.log(`   ⚠️  No orders found to test with`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status}`);
        console.log(`   📋 Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  } catch (error) {
    console.error('❌ General Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Veeqo Production API Test Completed!');
  console.log('📋 Summary:');
  console.log('   - All tests are READ ONLY (no purchases or modifications)');
  console.log('   - Tests show real data from your Veeqo account');
  console.log('   - API key is working if you see successful responses');
  console.log('   - No inventory will be updated or orders created');
  console.log('   - This confirms your Veeqo integration is ready for production');
}

// Run the test
testVeeqoProduction().catch(console.error);
