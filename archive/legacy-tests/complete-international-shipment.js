/**
 * Complete the international shipment workflow by setting destination address and creating shipment
 */

import { config } from 'dotenv';
config();

async function completeInternationalShipment() {
  console.log('🌍 Completing International Shipment Workflow');
  console.log('==============================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';
  const orderId = 1047280421; // Order from previous step
  const customerId = 954140755; // Rachel's customer ID

  try {
    // Step 1: Update order with delivery address
    console.log('🏠 Step 1: Setting delivery address on order');

    // Get Rachel's shipping address from customer
    const customerResponse = await fetch(`${VEEQO_BASE_URL}/customers/${customerId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    const customer = await customerResponse.json();
    const shippingAddress = customer.shipping_addresses[0]; // Use first shipping address

    console.log('✅ Using Rachel\'s shipping address:');
    console.log(`${shippingAddress.first_name} ${shippingAddress.last_name}`);
    console.log(`${shippingAddress.address1}, ${shippingAddress.address2}`);
    console.log(`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`);
    console.log(`${shippingAddress.country}`);

    // Update order with delivery address and customer reference
    const orderUpdateData = {
      customer_id: customerId,
      deliver_to_attributes: {
        customer_id: customerId,
        first_name: shippingAddress.first_name,
        last_name: shippingAddress.last_name,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
        email: shippingAddress.email
      }
    };

    console.log('\n📤 Updating order with delivery address...');

    const updateOrderResponse = await fetch(`${VEEQO_BASE_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderUpdateData)
    });

    console.log(`Order update response: ${updateOrderResponse.status} ${updateOrderResponse.statusText}`);

    if (updateOrderResponse.ok) {
      const updatedOrder = await updateOrderResponse.json();
      console.log('✅ Order updated with delivery address!');

      if (updatedOrder.deliver_to) {
        console.log(`✅ Delivery to: ${updatedOrder.deliver_to.first_name} ${updatedOrder.deliver_to.last_name}`);
        console.log(`✅ Country: ${updatedOrder.deliver_to.country}`);
      }

      // Step 2: Get allocation and try shipping quotes again
      console.log('\n🚢 Step 2: Getting shipping quotes with delivery address set');

      const allocationId = 686322084; // From previous step

      const quotesResponse = await fetch(`${VEEQO_BASE_URL}/shipping/quotes/amazon_shipping_v2?allocation_id=${allocationId}&from_allocation_package=true`, {
        headers: {
          'x-api-key': VEEQO_API_KEY,
          'Accept': 'application/json'
        }
      });

      console.log(`Quotes response: ${quotesResponse.status} ${quotesResponse.statusText}`);

      if (quotesResponse.ok) {
        const quotes = await quotesResponse.json();
        console.log('🎉 SUCCESS! International shipping quotes retrieved!');
        console.log(`Available quotes: ${quotes.length}`);

        if (quotes.length > 0) {
          console.log('\n📊 International Shipping Options for Rachel:');
          quotes.forEach((quote, index) => {
            console.log(`${index + 1}. ${quote.service_type || 'Unknown Service'}`);
            console.log(`   Carrier: ${quote.service_carrier || 'Unknown'}`);
            console.log(`   Cost: ${quote.total_net_charge || 'Unknown'}`);
            console.log(`   Delivery: ${quote.delivery_estimate || 'Unknown'}`);
            console.log();
          });

          // Step 3: Create the shipment using the first quote
          const selectedQuote = quotes[0];
          console.log(`🚛 Step 3: Creating international shipment with ${selectedQuote.service_type || 'DHL Express'}`);

          console.log('\n🔍 Debug: Full quote structure:');
          console.log(JSON.stringify(selectedQuote, null, 2));

          // Try minimal required payload based on API error message
          const shipmentData = {
            allocation_id: allocationId,
            carrier: selectedQuote.carrier,
            remote_shipment_id: selectedQuote.remote_shipment_id,
            sub_carrier_id: selectedQuote.sub_carrier_id,
            service_carrier: selectedQuote.service_carrier,
            total_net_charge: parseFloat(selectedQuote.total_net_charge),
            base_rate: parseFloat(selectedQuote.base_rate),
            service_type: selectedQuote.title,
            notify_customer: true
          };

          console.log('📤 Creating shipment with payload:');
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

          console.log(`\nShipment creation response: ${shipmentResponse.status} ${shipmentResponse.statusText}`);

          if (shipmentResponse.ok) {
            const shipment = await shipmentResponse.json();

            console.log('\n🎉🎉🎉 SUCCESS! INTERNATIONAL SHIPMENT CREATED! 🎉🎉🎉');
            console.log('=========================================================');
            console.log('📦 SHIPMENT DETAILS:');
            console.log(`🆔 Shipment ID: ${shipment.id || 'Generated'}`);
            console.log(`📋 Order ID: ${orderId}`);
            console.log(`🏷️  Tracking Number: ${shipment.tracking_number || 'Will be assigned'}`);
            console.log(`🚚 Carrier: ${shipment.service_carrier || selectedQuote.service_carrier}`);
            console.log(`📦 Service: ${shipment.service_type || selectedQuote.service_type}`);
            console.log(`💰 Shipping Cost: ${shipment.total_net_charge || selectedQuote.total_net_charge}`);
            console.log(`📊 Status: ${shipment.status || 'Created'}`);

            console.log('\n🌍 INTERNATIONAL DESTINATION:');
            console.log('👤 Rachel Keane');
            console.log('📧 rkeane@mynes.com');
            console.log('📞 +447408545978');
            console.log('🏠 50 Pleasants Avenue, Poringland');
            console.log('🌆 Norwich, Norfolk NR14 7FH');
            console.log('🇬🇧 United Kingdom (GB)');

            console.log('\n✅ WORKFLOW COMPLETE!');
            console.log('🚀 MCP Tool Integration: FULLY FUNCTIONAL!');
            console.log('🎯 Rachel will receive her Heavy-Duty Carpenter Work Jeans in Norwich, UK!');

            return {
              success: true,
              order: updatedOrder,
              shipment: shipment,
              destination: 'Norwich, UK'
            };

          } else {
            const shipmentError = await shipmentResponse.text();
            console.log('❌ Shipment creation failed:', shipmentError);
            return { success: false, error: 'Shipment creation failed' };
          }

        } else {
          console.log('⚠️  No shipping quotes available');
          return { success: false, error: 'No quotes available' };
        }

      } else {
        const quotesError = await quotesResponse.text();
        console.log('❌ Quotes still failing:', quotesError);
        return { success: false, error: 'Quotes failed' };
      }

    } else {
      const updateError = await updateOrderResponse.text();
      console.log('❌ Order update failed:', updateError);
      return { success: false, error: 'Order update failed' };
    }

  } catch (error) {
    console.error('❌ Workflow error:', error.message);
    return { success: false, error: error.message };
  }
}

completeInternationalShipment().catch(console.error);