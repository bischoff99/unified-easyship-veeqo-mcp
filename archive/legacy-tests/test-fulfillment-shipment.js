/**
 * Test shipment creation on awaiting_fulfillment orders
 */

import { config } from 'dotenv';
config();

const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
const VEEQO_BASE_URL = process.env.VEEQO_BASE_URL || 'https://api.veeqo.com';

async function makeVeeqoRequest(method, endpoint, data = null) {
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

  console.log(`🔍 ${method} ${endpoint}`);
  if (data) {
    console.log('📤 Request data:', JSON.stringify(data, null, 2));
  }

  const response = await fetch(`${VEEQO_BASE_URL}${endpoint}`, options);
  let responseData;
  try {
    responseData = await response.json();
  } catch {
    responseData = await response.text();
  }

  console.log(`📥 Response: ${response.status} ${response.statusText}`);
  if (responseData) {
    console.log('📄 Response data:', JSON.stringify(responseData, null, 2));
  }

  return { success: response.ok, data: responseData, status: response.status };
}

async function testShipmentOnFulfillmentOrder() {
  console.log('🚛 Testing Shipment Creation on Awaiting Fulfillment Order');
  console.log('=======================================================');

  // Use an awaiting_fulfillment order from the previous results
  const testOrderId = 1037196652; // This was "awaiting_fulfillment"

  console.log(`\n📦 Testing on Order ID: ${testOrderId}`);
  console.log('Status should be: awaiting_fulfillment');

  // First, get the order details to understand its structure
  console.log('\n📋 Step 1: Get order details');
  const orderResult = await makeVeeqoRequest('GET', `/orders/${testOrderId}`);

  if (!orderResult.success) {
    console.log('❌ Failed to get order details');
    return;
  }

  const order = orderResult.data;
  console.log(`✅ Order Status: ${order.status}`);
  console.log(`📍 Customer: ${order.customer?.first_name || 'Unknown'} ${order.customer?.last_name || ''}`);
  console.log(`📦 Line Items: ${order.line_items?.length || 0}`);

  // Now test different shipment creation approaches
  console.log('\n🚢 Step 2: Test shipment creation methods');

  // Rachel's international shipping details for the test
  const rachelShipmentData = {
    carrier: "DHL",
    service: "DHL Express International",
    tracking_number: `INTL-${Date.now()}`,
    notify_customer: true,
    tracking_url: "https://www.dhl.com/track",
    // International delivery address
    delivery_address: {
      first_name: "Rachel",
      last_name: "Keane",
      company: "",
      address_line_1: "50 Pleasants Avenue",
      address_line_2: "Poringland",
      city: "Norwich",
      state: "Norfolk",
      zip_code: "NR14 7FH",
      country: "GB",
      phone: "+447408545978",
      email: "rkeane@mynes.com"
    }
  };

  // Test different endpoints
  const endpoints = [
    {
      name: 'Direct shipment creation',
      method: 'POST',
      endpoint: `/orders/${testOrderId}/shipments`,
      data: rachelShipmentData
    },
    {
      name: 'Order fulfillment',
      method: 'POST',
      endpoint: `/orders/${testOrderId}/fulfill`,
      data: {
        carrier: rachelShipmentData.carrier,
        tracking_number: rachelShipmentData.tracking_number,
        notify_customer: rachelShipmentData.notify_customer,
        line_items: order.line_items?.map(item => ({
          id: item.id,
          quantity: item.quantity
        })) || []
      }
    },
    {
      name: 'Complete order with shipment',
      method: 'PUT',
      endpoint: `/orders/${testOrderId}`,
      data: {
        status: 'shipped',
        carrier: rachelShipmentData.carrier,
        tracking_number: rachelShipmentData.tracking_number,
        shipped_at: new Date().toISOString(),
        delivery_address: rachelShipmentData.delivery_address
      }
    }
  ];

  for (const test of endpoints) {
    console.log(`\n🧪 Testing: ${test.name}`);
    const result = await makeVeeqoRequest(test.method, test.endpoint, test.data);

    if (result.success) {
      console.log(`✅ ${test.name}: SUCCESS!`);
      console.log('🎉 International shipment to Rachel Keane created!');

      // If successful, check the updated order status
      console.log('\n🔍 Checking updated order status...');
      const updatedOrder = await makeVeeqoRequest('GET', `/orders/${testOrderId}`);
      if (updatedOrder.success) {
        console.log(`📊 New order status: ${updatedOrder.data.status}`);
      }

      return result.data;
    } else {
      console.log(`❌ ${test.name} failed`);
    }
  }

  console.log('\n⚠️  All shipment creation methods failed');
  return null;
}

// Run the test
testShipmentOnFulfillmentOrder().catch(console.error);