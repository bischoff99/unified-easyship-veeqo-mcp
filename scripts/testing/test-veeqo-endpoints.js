#!/usr/bin/env node

/**
 * Test Veeqo API Endpoints - Debug Issues
 * Tests different endpoints to find the correct ones
 */

import { VeeqoClient } from './dist/services/clients/veeqo-enhanced.js';

async function testVeeqoEndpoints() {
  console.log('🔍 Testing Veeqo API Endpoints - Debug Mode\n');

  if (!process.env.VEEQO_API_KEY || process.env.VEEQO_API_KEY === 'mock') {
    console.log('❌ VEEQO_API_KEY not set');
    console.log('💡 Run: VEEQO_API_KEY=your_key node test-veeqo-endpoints.js');
    return;
  }

  const client = new VeeqoClient();

  // Test different possible endpoints for inventory
  const inventoryEndpoints = [
    '/inventory_levels',
    '/inventory',
    '/stock_levels',
    '/product_inventory',
    '/inventory/levels',
    '/products/inventory',
  ];

  console.log('1. Testing Inventory Endpoints...');
  for (const endpoint of inventoryEndpoints) {
    try {
      console.log(`   Testing: ${endpoint}`);
      const response = await client.makeRequest('GET', endpoint);
      console.log(
        `   ✅ Success: ${endpoint} - Found ${response.length || Object.keys(response).length} items`
      );
      if (response.length > 0) {
        console.log(`   📊 Sample data:`, JSON.stringify(response[0], null, 2));
      }
      break; // Stop at first successful endpoint
    } catch (error) {
      console.log(`   ❌ Failed: ${endpoint} - ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test products endpoint with different parameters
  console.log('2. Testing Products Endpoint Variations...');
  const productEndpoints = [
    '/products',
    '/products?limit=5',
    '/products?page=1&limit=5',
    '/products?include=variants',
    '/products?include=inventory',
  ];

  for (const endpoint of productEndpoints) {
    try {
      console.log(`   Testing: ${endpoint}`);
      const response = await client.makeRequest('GET', endpoint);
      console.log(`   ✅ Success: ${endpoint}`);
      if (response.products) {
        console.log(`   📦 Found ${response.products.length} products`);
        if (response.products.length > 0) {
          const product = response.products[0];
          console.log(`   📋 Sample product fields:`, Object.keys(product));
        }
      } else if (Array.isArray(response)) {
        console.log(`   📦 Found ${response.length} products`);
        if (response.length > 0) {
          console.log(`   📋 Sample product fields:`, Object.keys(response[0]));
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${endpoint} - ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test orders endpoint with different parameters
  console.log('3. Testing Orders Endpoint Variations...');
  const orderEndpoints = [
    '/orders',
    '/orders?limit=5',
    '/orders?page=1&limit=5',
    '/orders?include=customer',
    '/orders?include=line_items',
  ];

  for (const endpoint of orderEndpoints) {
    try {
      console.log(`   Testing: ${endpoint}`);
      const response = await client.makeRequest('GET', endpoint);
      console.log(`   ✅ Success: ${endpoint}`);
      if (response.orders) {
        console.log(`   📋 Found ${response.orders.length} orders`);
        if (response.orders.length > 0) {
          const order = response.orders[0];
          console.log(`   📋 Sample order fields:`, Object.keys(order));
        }
      } else if (Array.isArray(response)) {
        console.log(`   📋 Found ${response.length} orders`);
        if (response.length > 0) {
          console.log(`   📋 Sample order fields:`, Object.keys(response[0]));
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${endpoint} - ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test locations endpoint
  console.log('4. Testing Locations Endpoint...');
  try {
    const response = await client.makeRequest('GET', '/locations');
    console.log(`   ✅ Success: /locations`);
    if (response.locations) {
      console.log(`   📍 Found ${response.locations.length} locations`);
      if (response.locations.length > 0) {
        const location = response.locations[0];
        console.log(`   📍 Sample location fields:`, Object.keys(location));
      }
    } else if (Array.isArray(response)) {
      console.log(`   📍 Found ${response.length} locations`);
      if (response.length > 0) {
        console.log(`   📍 Sample location fields:`, Object.keys(response[0]));
      }
    }
  } catch (error) {
    console.log(`   ❌ Failed: /locations - ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Veeqo API Endpoint Testing Completed!');
  console.log('📋 This will help identify the correct endpoints and data structure');
}

// Run the test
testVeeqoEndpoints().catch(console.error);
