/**
 * Test the correct /shipments endpoint as documented in Veeqo forum
 */

import { config } from 'dotenv';
config();

async function testCorrectShipmentsEndpoint() {
  console.log('🚛 Testing Correct Veeqo Shipments Endpoint');
  console.log('============================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  // Use a fresh awaiting_fulfillment order
  const testOrderId = 1037155748;

  try {
    console.log(`📦 Creating shipment for Order ID: ${testOrderId}`);

    // First, let's get the order to see what data we have
    console.log('\n📋 Getting order details...');
    const orderResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    const order = await orderResponse.json();
    console.log(`Order status: ${order.status}`);
    console.log(`Order has ${order.line_items?.length || 0} line items`);

    // Now test the correct shipments endpoint with proper payload
    console.log('\n🚢 Testing POST /shipments (correct endpoint from forum)');

    const shipmentData = {
      order_id: testOrderId,
      carrier: "DHL",
      service: "DHL Express International",
      tracking_number: `FORUM-FIX-${Date.now()}`,
      notify_customer: true,
      line_items: order.line_items?.map(item => ({
        id: item.id,
        quantity: item.quantity
      })) || []
    };

    console.log('📤 Request payload:');
    console.log(JSON.stringify(shipmentData, null, 2));

    const shipmentResponse = await fetch(`${VEEQO_BASE_URL}/shipments`, {
      method: 'POST',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(shipmentData)
    });

    console.log(`\n📥 Response: ${shipmentResponse.status} ${shipmentResponse.statusText}`);

    if (shipmentResponse.ok) {
      const result = await shipmentResponse.json();
      console.log('✅ SUCCESS! Shipment created:');
      console.log(JSON.stringify(result, null, 2));

      // Check if the order status changed
      console.log('\n🔍 Checking updated order status...');
      const updatedOrderResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
        headers: {
          'x-api-key': VEEQO_API_KEY,
          'Accept': 'application/json'
        }
      });

      const updatedOrder = await updatedOrderResponse.json();
      console.log('📊 Updated Order Status:');
      console.log(`- Status: ${updatedOrder.status}`);
      console.log(`- Carrier: ${updatedOrder.carrier || 'Not set'}`);
      console.log(`- Tracking: ${updatedOrder.tracking_number || 'Not set'}`);
      console.log(`- Shipped At: ${updatedOrder.shipped_at || 'Not set'}`);

      console.log('\n🎉 Shipment creation successful! Rachel Keane can receive her jeans in Norwich!');

    } else {
      const errorText = await shipmentResponse.text();
      console.log(`❌ Failed: ${errorText}`);

      // Try alternative formats if first attempt fails
      console.log('\n🔄 Trying alternative payload format...');

      const altPayload = {
        shipment: shipmentData  // Try wrapping in shipment object
      };

      const altResponse = await fetch(`${VEEQO_BASE_URL}/shipments`, {
        method: 'POST',
        headers: {
          'x-api-key': VEEQO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(altPayload)
      });

      console.log(`Alternative response: ${altResponse.status} ${altResponse.statusText}`);

      if (altResponse.ok) {
        const altResult = await altResponse.json();
        console.log('✅ Alternative format worked!');
        console.log(JSON.stringify(altResult, null, 2));
      } else {
        const altError = await altResponse.text();
        console.log(`Alternative also failed: ${altError}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCorrectShipmentsEndpoint().catch(console.error);