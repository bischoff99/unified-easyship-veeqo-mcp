/**
 * Veeqo Shipment Creation Test
 * Test different API endpoints to find the correct shipment creation method
 */

import { config } from 'dotenv';

config();

const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
const VEEQO_BASE_URL = process.env.VEEQO_BASE_URL || 'https://api.veeqo.com';

async function makeVeeqoRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    console.log(`🔍 Testing: ${method} ${endpoint}`);
    const response = await fetch(`${VEEQO_BASE_URL}${endpoint}`, options);

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    if (response.ok) {
      return { success: true, data: responseData, status: response.status };
    } else {
      return {
        success: false,
        status: response.status,
        message: responseData?.message || `HTTP ${response.status}`,
        data: responseData
      };
    }
  } catch (error) {
    return {
      success: false,
      status: null,
      message: error.message,
      data: null
    };
  }
}

async function testVeeqoShipmentEndpoints() {
  console.log('🧪 Veeqo Shipment Endpoint Discovery');
  console.log('=====================================');
  console.log();

  // First, get some orders to work with
  console.log('📋 Step 1: Get existing orders');
  const ordersResult = await makeVeeqoRequest('GET', '/orders?page_size=5');

  if (!ordersResult.success) {
    console.log('❌ Failed to get orders:', ordersResult);
    return;
  }

  console.log(`✅ Found ${ordersResult.data.length} orders`);

  if (ordersResult.data.length === 0) {
    console.log('⚠️  No orders available to test shipment creation');
    return;
  }

  const testOrder = ordersResult.data[0];
  console.log(`🎯 Using order ID: ${testOrder.id} (Status: ${testOrder.status})`);
  console.log();

  // Test different shipment endpoints
  const endpoints = [
    { name: 'Direct shipments endpoint', endpoint: '/shipments' },
    { name: 'Order-specific shipments', endpoint: `/orders/${testOrder.id}/shipments` },
    { name: 'Order fulfillment', endpoint: `/orders/${testOrder.id}/fulfill` },
    { name: 'Order allocations', endpoint: `/orders/${testOrder.id}/allocations` },
    { name: 'Order completion', endpoint: `/orders/${testOrder.id}/complete` },
    { name: 'Shipments with order_id', endpoint: '/shipments' }
  ];

  // First test GET requests to see which endpoints exist
  console.log('🔍 Step 2: Testing endpoint availability (GET requests)');
  for (const endpoint of endpoints.slice(0, 5)) {
    const result = await makeVeeqoRequest('GET', endpoint.endpoint);
    console.log(`${result.success ? '✅' : '❌'} ${endpoint.name}: ${result.success ? result.status : `${result.status} - ${result.message}`}`);
  }
  console.log();

  // Test POST requests for shipment creation
  console.log('🚛 Step 3: Testing shipment creation (POST requests)');

  // Rachel Keane's shipment data
  const rachelShipmentData = {
    order_id: testOrder.id,
    carrier: "DHL",
    service: "DHL Express International",
    notify_customer: true,
    tracking_number: `TEST-${Date.now()}`,
    line_items: testOrder.line_items?.slice(0, 1).map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: 1
    })) || []
  };

  console.log('📦 Test shipment data:');
  console.log(JSON.stringify(rachelShipmentData, null, 2));
  console.log();

  // Test different POST approaches
  const postTests = [
    {
      name: 'POST /shipments',
      endpoint: '/shipments',
      data: rachelShipmentData
    },
    {
      name: 'POST /orders/{id}/shipments',
      endpoint: `/orders/${testOrder.id}/shipments`,
      data: {
        carrier: rachelShipmentData.carrier,
        service: rachelShipmentData.service,
        tracking_number: rachelShipmentData.tracking_number,
        line_items: rachelShipmentData.line_items
      }
    },
    {
      name: 'POST /orders/{id}/fulfill',
      endpoint: `/orders/${testOrder.id}/fulfill`,
      data: {
        carrier: rachelShipmentData.carrier,
        tracking_number: rachelShipmentData.tracking_number,
        notify_customer: rachelShipmentData.notify_customer
      }
    }
  ];

  for (const test of postTests) {
    console.log(`🧪 Testing: ${test.name}`);
    const result = await makeVeeqoRequest('POST', test.endpoint, test.data);

    if (result.success) {
      console.log(`✅ ${test.name}: SUCCESS!`);
      console.log('Response:', JSON.stringify(result.data, null, 2));
    } else {
      console.log(`❌ ${test.name}: ${result.status} - ${result.message}`);
      if (result.data) {
        console.log('Error details:', JSON.stringify(result.data, null, 2));
      }
    }
    console.log();
  }

  // If direct creation fails, try exploring the order structure
  console.log('📊 Step 4: Analyzing order structure for shipment clues');
  console.log('Order details:');
  console.log(`- ID: ${testOrder.id}`);
  console.log(`- Status: ${testOrder.status}`);
  console.log(`- Line items: ${testOrder.line_items?.length || 0}`);
  console.log(`- Delivery method: ${testOrder.deliver_to}`);
  console.log(`- Customer: ${testOrder.customer?.first_name} ${testOrder.customer?.last_name}`);

  if (testOrder.line_items) {
    console.log('- Products:');
    testOrder.line_items.forEach((item, index) => {
      console.log(`  ${index + 1}. Product ${item.product_id}, Variant ${item.variant_id}, Qty: ${item.quantity}`);
    });
  }
}

// Run the test
testVeeqoShipmentEndpoints().catch(console.error);