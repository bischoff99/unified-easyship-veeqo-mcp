/**
 * Test the /shipping/shipments endpoint found in Veeqo documentation
 */

import { config } from 'dotenv';
config();

async function testShippingEndpoint() {
  console.log('🚛 Testing /shipping/shipments endpoint');
  console.log('=====================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  // Use order that's awaiting_fulfillment
  const testOrderId = 1037155748;

  try {
    // First get order details
    console.log(`📦 Getting details for Order ID: ${testOrderId}`);
    const orderResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    const order = await orderResponse.json();
    console.log(`Current status: ${order.status}`);

    // Test the shipping endpoint
    console.log('\n🚢 Testing POST /shipping/shipments');

    const shipmentData = {
      order_id: testOrderId,
      carrier: "DHL",
      service: "Express International",
      tracking_number: `SHIP-${Date.now()}`,
      notify_customer: true
    };

    console.log('Request payload:', JSON.stringify(shipmentData, null, 2));

    const response = await fetch(`${VEEQO_BASE_URL}/shipping/shipments`, {
      method: 'POST',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(shipmentData)
    });

    console.log(`Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Shipment created via shipping endpoint:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Failed:', error);

      // Try alternative endpoint paths
      const alternatives = [
        '/shipping/shipment',
        '/api/shipping/shipments',
        '/v1/shipping/shipments',
        '/orders/{id}/ship'
      ];

      for (const alt of alternatives) {
        console.log(`\n🔄 Trying ${alt}...`);
        const endpoint = alt.includes('{id}') ? alt.replace('{id}', testOrderId) : alt;

        const altResponse = await fetch(`${VEEQO_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'x-api-key': VEEQO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(shipmentData)
        });

        console.log(`${alt}: ${altResponse.status} ${altResponse.statusText}`);
        if (altResponse.ok) {
          const altResult = await altResponse.json();
          console.log('✅ Alternative endpoint worked!');
          console.log(JSON.stringify(altResult, null, 2));
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testShippingEndpoint().catch(console.error);