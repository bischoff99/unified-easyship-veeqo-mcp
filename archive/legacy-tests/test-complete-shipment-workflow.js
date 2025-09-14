/**
 * Test the complete Veeqo shipment workflow:
 * 1. Get order with allocation_id
 * 2. Get shipping quotes
 * 3. Purchase shipping label
 */

import { config } from 'dotenv';
config();

async function testCompleteShipmentWorkflow() {
  console.log('🚛 Testing Complete Veeqo Shipment Workflow');
  console.log('============================================');
  console.log('Following the official Veeqo API guide:');
  console.log('1. Get order allocation_id');
  console.log('2. Get shipping quotes');
  console.log('3. Purchase shipping label');
  console.log();

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  // Use order that's awaiting_fulfillment
  const testOrderId = 1037155748;

  try {
    // STEP 1: Get order details and extract allocation_id
    console.log('📋 Step 1: Getting order details and allocation_id');
    console.log(`Order ID: ${testOrderId}`);

    const orderResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!orderResponse.ok) {
      throw new Error(`Failed to get order: ${orderResponse.status} ${orderResponse.statusText}`);
    }

    const order = await orderResponse.json();
    console.log(`✅ Order status: ${order.status}`);
    console.log(`✅ Allocations found: ${order.allocations?.length || 0}`);

    if (!order.allocations || order.allocations.length === 0) {
      throw new Error('No allocations found for this order');
    }

    const allocation = order.allocations[0];
    const allocationId = allocation.id;
    console.log(`✅ Allocation ID: ${allocationId}`);
    console.log(`✅ Warehouse: ${allocation.warehouse?.name || 'Unknown'}`);
    console.log();

    // STEP 2: Get shipping quotes
    console.log('📦 Step 2: Getting shipping quotes');

    const quotesResponse = await fetch(`${VEEQO_BASE_URL}/shipping/quotes/amazon_shipping_v2?allocation_id=${allocationId}&from_allocation_package=true`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    console.log(`Quotes response: ${quotesResponse.status} ${quotesResponse.statusText}`);

    if (quotesResponse.ok) {
      const quotes = await quotesResponse.json();
      console.log('✅ Shipping quotes retrieved successfully!');
      console.log(`Available quotes: ${quotes.length || 0}`);

      if (quotes.length > 0) {
        const quote = quotes[0];
        console.log('\n📊 Quote details:');
        console.log(`- Service: ${quote.service_type || 'Unknown'}`);
        console.log(`- Carrier: ${quote.service_carrier || 'Unknown'}`);
        console.log(`- Cost: ${quote.total_net_charge || 'Unknown'}`);
        console.log(`- Remote Shipment ID: ${quote.remote_shipment_id || 'Unknown'}`);

        // STEP 3: Purchase shipping label
        console.log('\n🚢 Step 3: Purchasing shipping label');

        const shipmentData = {
          allocation_id: allocationId,
          carrier_id: quote.carrier_id,
          remote_shipment_id: quote.remote_shipment_id,
          service_type: quote.service_type,
          sub_carrier_id: quote.sub_carrier_id,
          service_carrier: quote.service_carrier,
          total_net_charge: quote.total_net_charge,
          base_rate: quote.base_rate,
          notify_customer: true,
          // International shipping details for Rachel Keane
          delivery_method: 'DHL Express International'
        };

        console.log('📤 Shipment request payload:');
        console.log(JSON.stringify(shipmentData, null, 2));

        const shipmentResponse = await fetch(`${VEEQO_BASE_URL}/shipping/shipments`, {
          method: 'POST',
          headers: {
            'x-api-key': VEEQO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(shipmentData)
        });

        console.log(`\n📥 Shipment response: ${shipmentResponse.status} ${shipmentResponse.statusText}`);

        if (shipmentResponse.ok) {
          const shipmentResult = await shipmentResponse.json();
          console.log('🎉 SUCCESS! International shipment created for Rachel Keane!');
          console.log('\n📦 Shipment Details:');
          console.log(JSON.stringify(shipmentResult, null, 2));

          console.log('\n🎯 Rachel Keane will receive her package in Norwich, UK!');
          console.log('Delivery Address: 50 Pleasants Avenue, Poringland, Norwich, Norfolk NR14 7FH, UK');

        } else {
          const error = await shipmentResponse.text();
          console.log('❌ Shipment creation failed:', error);
        }

      } else {
        console.log('⚠️  No shipping quotes available for this allocation');
      }

    } else {
      const quotesError = await quotesResponse.text();
      console.log('❌ Failed to get quotes:', quotesError);

      // Try alternative quote endpoints
      console.log('\n🔄 Trying alternative quote endpoints...');

      const alternatives = [
        '/shipping/quotes',
        '/shipping/rates',
        `/allocations/${allocationId}/quotes`,
        `/allocations/${allocationId}/shipping_rates`
      ];

      for (const alt of alternatives) {
        console.log(`Testing: ${alt}`);
        const altResponse = await fetch(`${VEEQO_BASE_URL}${alt}?allocation_id=${allocationId}`, {
          headers: {
            'x-api-key': VEEQO_API_KEY,
            'Accept': 'application/json'
          }
        });

        console.log(`${alt}: ${altResponse.status} ${altResponse.statusText}`);

        if (altResponse.ok) {
          const altQuotes = await altResponse.json();
          console.log('✅ Alternative endpoint worked!');
          console.log('Sample response:', JSON.stringify(altQuotes, null, 2));
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Workflow error:', error.message);
  }
}

testCompleteShipmentWorkflow().catch(console.error);