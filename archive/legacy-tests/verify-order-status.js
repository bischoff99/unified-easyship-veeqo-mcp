/**
 * Verify what actually happened to the order
 */

import { config } from 'dotenv';
config();

async function checkOrderStatus() {
  console.log('🔍 Checking actual order status after shipment attempt');
  console.log('====================================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  const testOrderId = 1037197517;

  try {
    console.log(`📦 Checking Order ID: ${testOrderId}`);

    const response = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      method: 'GET',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const order = await response.json();

    console.log('📊 Current Order Status:');
    console.log(`- Status: ${order.status}`);
    console.log(`- Shipped At: ${order.shipped_at || 'Not shipped'}`);
    console.log(`- Carrier: ${order.carrier || 'Not set'}`);
    console.log(`- Tracking: ${order.tracking_number || 'Not set'}`);
    console.log(`- Updated At: ${new Date(order.updated_at).toLocaleString()}`);
    console.log();

    // Check if there are any shipments associated
    if (order.shipments && order.shipments.length > 0) {
      console.log('🚛 Associated Shipments:');
      order.shipments.forEach((shipment, index) => {
        console.log(`  ${index + 1}. ID: ${shipment.id} | Status: ${shipment.status} | Tracking: ${shipment.tracking_number}`);
      });
    } else {
      console.log('❌ No shipments found on this order');
    }

    // Let's also check if the API call pattern was wrong
    console.log('\n🧪 Testing different API approaches...');

    // Try the direct shipment creation that failed before
    console.log('\n1. Testing POST /orders/{id}/shipments (previously failed)');
    const shipmentData = {
      carrier: "DHL",
      service: "DHL Express International",
      tracking_number: `TEST-VERIFY-${Date.now()}`,
      notify_customer: true
    };

    const shipmentResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}/shipments`, {
      method: 'POST',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(shipmentData)
    });

    console.log(`Response: ${shipmentResponse.status} ${shipmentResponse.statusText}`);
    const shipmentResult = await shipmentResponse.text();
    console.log('Response body:', shipmentResult);

  } catch (error) {
    console.error('❌ Error checking order:', error.message);
  }
}

checkOrderStatus().catch(console.error);