/**
 * Fix country code issue and test shipment creation
 */

import { config } from 'dotenv';
config();

async function fixCountryCodeAndCreateShipment() {
  console.log('🔧 Fixing Country Code Issue for International Shipment');
  console.log('======================================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  const testOrderId = 1037155748;

  try {
    // First, let's examine the order's delivery address
    console.log('📋 Step 1: Examining order delivery address');

    const orderResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    const order = await orderResponse.json();

    console.log('🏠 Current delivery address:');
    console.log(JSON.stringify(order.deliver_to, null, 2));

    console.log('🏠 Current billing address:');
    console.log(JSON.stringify(order.billing_address, null, 2));

    // Try to update the order with Rachel's correct address and proper country code
    console.log('\n🔧 Step 2: Updating order with Rachel Keane\'s address (GB country code)');

    const updateData = {
      deliver_to: {
        first_name: "Rachel",
        last_name: "Keane",
        address1: "50 Pleasants Avenue",
        address2: "Poringland",
        city: "Norwich",
        state: "Norfolk",
        zip: "NR14 7FH",
        country: "GB", // Use ISO country code instead of "United Kingdom"
        phone: "+447408545978",
        email: "rkeane@mynes.com"
      },
      customer_note: "International shipment to Rachel Keane in Norwich, UK"
    };

    console.log('📤 Update payload:');
    console.log(JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch(`${VEEQO_BASE_URL}/orders/${testOrderId}`, {
      method: 'PUT',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    console.log(`Update response: ${updateResponse.status} ${updateResponse.statusText}`);

    if (updateResponse.ok) {
      const updatedOrder = await updateResponse.json();
      console.log('✅ Order updated successfully!');
      console.log('New delivery address:');
      console.log(JSON.stringify(updatedOrder.deliver_to, null, 2));

      // Now try the shipping quotes again
      console.log('\n📦 Step 3: Trying shipping quotes with corrected address');

      const allocationId = updatedOrder.allocations[0].id;
      console.log(`Using allocation ID: ${allocationId}`);

      const quotesResponse = await fetch(`${VEEQO_BASE_URL}/shipping/quotes/amazon_shipping_v2?allocation_id=${allocationId}&from_allocation_package=true`, {
        headers: {
          'x-api-key': VEEQO_API_KEY,
          'Accept': 'application/json'
        }
      });

      console.log(`Quotes response: ${quotesResponse.status} ${quotesResponse.statusText}`);

      if (quotesResponse.ok) {
        const quotes = await quotesResponse.json();
        console.log('✅ SUCCESS! Shipping quotes retrieved!');
        console.log(`Available quotes: ${quotes.length}`);

        if (quotes.length > 0) {
          console.log('\n🎉 International shipping quotes available for Rachel Keane!');
          quotes.forEach((quote, index) => {
            console.log(`${index + 1}. ${quote.service_type || 'Unknown Service'} - ${quote.service_carrier || 'Unknown Carrier'} - ${quote.total_net_charge || 'Unknown Cost'}`);
          });

          // Use the first quote to create shipment
          const quote = quotes[0];
          console.log('\n🚢 Step 4: Creating international shipment with first quote');

          const shipmentData = {
            allocation_id: allocationId,
            carrier_id: quote.carrier_id,
            remote_shipment_id: quote.remote_shipment_id,
            service_type: quote.service_type,
            sub_carrier_id: quote.sub_carrier_id,
            service_carrier: quote.service_carrier,
            total_net_charge: quote.total_net_charge,
            base_rate: quote.base_rate,
            notify_customer: true
          };

          const shipmentResponse = await fetch(`${VEEQO_BASE_URL}/shipping/shipments`, {
            method: 'POST',
            headers: {
              'x-api-key': VEEQO_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(shipmentData)
          });

          console.log(`Shipment response: ${shipmentResponse.status} ${shipmentResponse.statusText}`);

          if (shipmentResponse.ok) {
            const shipment = await shipmentResponse.json();
            console.log('🎉 SUCCESS! International shipment created for Rachel Keane!');
            console.log('\n📦 Shipment Details:');
            console.log(`- Shipment ID: ${shipment.id || 'Unknown'}`);
            console.log(`- Tracking Number: ${shipment.tracking_number || 'Unknown'}`);
            console.log(`- Service: ${shipment.service_type || 'Unknown'}`);
            console.log(`- Carrier: ${shipment.service_carrier || 'Unknown'}`);
            console.log(`- Status: ${shipment.status || 'Unknown'}`);

            console.log('\n🌍 Rachel Keane will receive her international shipment in Norwich, UK!');
            console.log('📍 50 Pleasants Avenue, Poringland, Norwich, Norfolk NR14 7FH, United Kingdom');
            console.log('📞 +447408545978');
            console.log('✉️  rkeane@mynes.com');

          } else {
            const shipmentError = await shipmentResponse.text();
            console.log('❌ Shipment creation failed:', shipmentError);
          }
        }

      } else {
        const quotesError = await quotesResponse.text();
        console.log('❌ Quotes still failing:', quotesError);
      }

    } else {
      const updateError = await updateResponse.text();
      console.log('❌ Order update failed:', updateError);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixCountryCodeAndCreateShipment().catch(console.error);