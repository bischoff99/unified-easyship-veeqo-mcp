#!/usr/bin/env node

/**
 * Veeqo API Scraper
 * Discovers all available Veeqo API endpoints and their data structures
 */

import { VeeqoClient } from './dist/services/clients/veeqo-enhanced.js';

async function scrapeVeeqoAPIs() {
  console.log('🔍 Veeqo API Scraper - Discovering All Endpoints\n');

  if (!process.env.VEEQO_API_KEY || process.env.VEEQO_API_KEY === 'mock') {
    console.log('❌ VEEQO_API_KEY not set');
    console.log('💡 Run: VEEQO_API_KEY=your_key node scrape-veeqo-apis.js');
    return;
  }

  const client = new VeeqoClient();
  const discoveredEndpoints = new Map();

  // Common API endpoint patterns to test
  const endpointPatterns = [
    // Core resources
    '/products', '/orders', '/locations', '/customers', '/suppliers',
    '/inventory', '/inventory_levels', '/stock_levels', '/allocations',
    '/shipments', '/returns', '/refunds', '/payments', '/invoices',

    // Product related
    '/products/variants', '/products/images', '/products/categories',
    '/products/brands', '/products/tags', '/products/attributes',

    // Order related
    '/orders/line_items', '/orders/fulfillments', '/orders/shipments',
    '/orders/returns', '/orders/refunds', '/orders/payments',

    // Location related
    '/locations/inventory', '/locations/allocations', '/warehouses',

    // Customer related
    '/customers/addresses', '/customers/orders', '/contacts',

    // Shipping related
    '/shipping_methods', '/carriers', '/tracking', '/labels',

    // Analytics and reports
    '/analytics', '/reports', '/metrics', '/dashboard',

    // Settings and configuration
    '/settings', '/config', '/webhooks', '/integrations',
    '/channels', '/marketplaces', '/tax_rates', '/price_lists',

    // User and permissions
    '/users', '/permissions', '/roles', '/teams',

    // System
    '/health', '/status', '/version', '/ping'
  ];

  console.log('1. Testing Core Endpoints...\n');

  for (const endpoint of endpointPatterns) {
    try {
      console.log(`   Testing: ${endpoint}`);
      const response = await client.makeRequest('GET', endpoint);

      // Analyze response structure
      const analysis = analyzeResponse(endpoint, response);
      discoveredEndpoints.set(endpoint, analysis);

      console.log(`   ✅ Success: ${endpoint}`);
      console.log(`   📊 Structure: ${analysis.type}`);
      console.log(`   📋 Fields: ${analysis.fields.length} fields`);
      if (analysis.sampleData) {
        console.log(`   🔍 Sample: ${JSON.stringify(analysis.sampleData).substring(0, 100)}...`);
      }
      console.log('');

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      const status = error.message.includes('404') ? 'Not Found' :
                    error.message.includes('401') ? 'Unauthorized' :
                    error.message.includes('403') ? 'Forbidden' :
                    error.message.includes('429') ? 'Rate Limited' :
                    error.message.includes('500') ? 'Server Error' : 'Error';

      console.log(`   ❌ ${status}: ${endpoint}`);

      // Still record the endpoint for documentation
      discoveredEndpoints.set(endpoint, {
        type: 'error',
        status: status,
        error: error.message,
        fields: [],
        sampleData: null
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('2. Testing Endpoint Variations...\n');

  // Test variations of successful endpoints
  const successfulEndpoints = Array.from(discoveredEndpoints.entries())
    .filter(([_, analysis]) => analysis.type !== 'error')
    .map(([endpoint, _]) => endpoint);

  for (const endpoint of successfulEndpoints.slice(0, 5)) { // Test top 5 successful endpoints
    const variations = [
      `${endpoint}?limit=1`,
      `${endpoint}?page=1&limit=1`,
      `${endpoint}?include=all`,
      `${endpoint}?fields=id,title,name`,
      `${endpoint}?sort=created_at`,
      `${endpoint}?order=desc`
    ];

    for (const variation of variations) {
      try {
        console.log(`   Testing: ${variation}`);
        const response = await client.makeRequest('GET', variation);
        const analysis = analyzeResponse(variation, response);

        console.log(`   ✅ Success: ${variation}`);
        console.log(`   📊 Structure: ${analysis.type}`);
        console.log('');

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.log(`   ❌ Failed: ${variation}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('3. Generating API Documentation...\n');

  // Generate comprehensive documentation
  generateAPIDocumentation(discoveredEndpoints);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Veeqo API Scraping Completed!');
  console.log(`📊 Discovered ${discoveredEndpoints.size} endpoints`);
  console.log(`✅ Successful: ${Array.from(discoveredEndpoints.values()).filter(a => a.type !== 'error').length}`);
  console.log(`❌ Failed: ${Array.from(discoveredEndpoints.values()).filter(a => a.type === 'error').length}`);
}

function analyzeResponse(endpoint, response) {
  let type = 'unknown';
  let fields = [];
  let sampleData = null;

  if (Array.isArray(response)) {
    type = 'array';
    fields = response.length > 0 ? Object.keys(response[0]) : [];
    sampleData = response.length > 0 ? response[0] : null;
  } else if (response && typeof response === 'object') {
    if (response.products) {
      type = 'products_wrapper';
      fields = response.products.length > 0 ? Object.keys(response.products[0]) : [];
      sampleData = response.products.length > 0 ? response.products[0] : null;
    } else if (response.orders) {
      type = 'orders_wrapper';
      fields = response.orders.length > 0 ? Object.keys(response.orders[0]) : [];
      sampleData = response.orders.length > 0 ? response.orders[0] : null;
    } else if (response.locations) {
      type = 'locations_wrapper';
      fields = response.locations.length > 0 ? Object.keys(response.locations[0]) : [];
      sampleData = response.locations.length > 0 ? response.locations[0] : null;
    } else {
      type = 'object';
      fields = Object.keys(response);
      sampleData = response;
    }
  }

  return {
    type,
    fields,
    sampleData,
    endpoint
  };
}

function generateAPIDocumentation(endpoints) {
  const successful = Array.from(endpoints.entries())
    .filter(([_, analysis]) => analysis.type !== 'error');

  const failed = Array.from(endpoints.entries())
    .filter(([_, analysis]) => analysis.type === 'error');

  console.log('📚 VEEQO API DOCUMENTATION');
  console.log('='.repeat(50));

  console.log('\n✅ WORKING ENDPOINTS:');
  console.log('-'.repeat(30));

  successful.forEach(([endpoint, analysis]) => {
    console.log(`\n${endpoint}`);
    console.log(`  Type: ${analysis.type}`);
    console.log(`  Fields: ${analysis.fields.join(', ')}`);
    if (analysis.sampleData) {
      console.log(`  Sample: ${JSON.stringify(analysis.sampleData, null, 2).substring(0, 200)}...`);
    }
  });

  console.log('\n❌ FAILED ENDPOINTS:');
  console.log('-'.repeat(30));

  failed.forEach(([endpoint, analysis]) => {
    console.log(`${endpoint} - ${analysis.status}`);
  });

  console.log('\n📋 SUMMARY:');
  console.log('-'.repeat(30));
  console.log(`Total endpoints tested: ${endpoints.size}`);
  console.log(`Working endpoints: ${successful.length}`);
  console.log(`Failed endpoints: ${failed.length}`);
  console.log(`Success rate: ${((successful.length / endpoints.size) * 100).toFixed(1)}%`);
}

// Run the scraper
scrapeVeeqoAPIs().catch(console.error);
