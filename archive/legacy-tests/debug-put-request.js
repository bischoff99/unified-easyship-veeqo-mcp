/**
 * Debug the PUT request that seemed to work but didn't actually create shipment
 */

import { config } from 'dotenv';
config();

async function debugPutRequest() {
  console.log('🔍 Debugging PUT request to understand why shipment wasn\'t created');
  console.log('==================================================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  // Use a fresh order that's awaiting_fulfillment
  const testOrderId = 1037155748; // Another awaiting_fulfillment order

  try {
    console.log(`📦 Testing with Order ID: ${testOrderId}`);

    // First get the current order state
    console.log('\n📋 Step 1: Get current order state');
    const getResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      headers: { 'x-api-key': VEEQO_API_KEY, 'Accept': 'application/json' }
    });
    const currentOrder = await getResponse.json();
    console.log(`Current status: ${currentOrder.status}`);
    console.log(`Current carrier: ${currentOrder.carrier || 'None'}`);
    console.log(`Current tracking: ${currentOrder.tracking_number || 'None'}`);

    // Test different PUT request structures
    const testCases = [
      {
        name: 'Minimal status update',
        data: { status: 'shipped' }
      },
      {
        name: 'Status with carrier info',
        data: {
          status: 'shipped',
          carrier: 'DHL',
          tracking_number: `DBG-${Date.now()}`
        }
      },
      {
        name: 'Wrapped in order object',
        data: {
          order: {
            status: 'shipped',
            carrier: 'DHL',
            tracking_number: `DBG-WRAP-${Date.now()}`
          }
        }
      },
      {
        name: 'With shipped_at timestamp',
        data: {
          status: 'shipped',
          carrier: 'DHL',
          tracking_number: `DBG-TIME-${Date.now()}`,
          shipped_at: new Date().toISOString()
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log('Request data:', JSON.stringify(testCase.data, null, 2));

      const response = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'x-api-key': VEEQO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });

      console.log(`Response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success - Updated status: ${result.status}`);
        console.log(`✅ Carrier: ${result.carrier || 'Not set'}`);
        console.log(`✅ Tracking: ${result.tracking_number || 'Not set'}`);

        // If this worked, let's check the order again to see the final state
        if (result.status === 'shipped') {
          console.log('🎉 Order status changed to shipped! Checking final state...');

          const finalCheck = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
            headers: { 'x-api-key': VEEQO_API_KEY, 'Accept': 'application/json' }
          });
          const finalOrder = await finalCheck.json();

          console.log('📊 Final Order State:');
          console.log(`- Status: ${finalOrder.status}`);
          console.log(`- Shipped At: ${finalOrder.shipped_at || 'Not set'}`);
          console.log(`- Carrier: ${finalOrder.carrier || 'Not set'}`);
          console.log(`- Tracking: ${finalOrder.tracking_number || 'Not set'}`);

          break; // Stop testing once we find a working approach
        }
      } else {
        const error = await response.text();
        console.log(`❌ Failed: ${error}`);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugPutRequest().catch(console.error);