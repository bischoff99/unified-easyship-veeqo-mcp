/**
 * Create a new order for Rachel Keane with correct country code and complete shipment
 */

import { config } from 'dotenv';
config();

async function createRachelOrderAndShipment() {
  console.log('🛒 Creating New Order for Rachel Keane with International Shipment');
  console.log('===================================================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  try {
    // First, let's get a product to include in the order
    console.log('📦 Step 1: Getting available products');

    const productsResponse = await fetch(`${VEEQO_BASE_URL}/products?page_size=5`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    const products = await productsResponse.json();
    if (!products.length) {
      throw new Error('No products found');
    }

    const product = products[0];
    const variant = product.sellables[0];
    console.log(`✅ Using product: ${product.title}`);
    console.log(`✅ Variant: ${variant.title || 'Default variant'}`);

    // Create new order for Rachel Keane with correct country code
    console.log('\n🛒 Step 2: Creating new order for Rachel Keane');

    // Wrap in order object as required by Veeqo API
    const orderData = {
      order: {
        channel_id: 731570,
        customer_attributes: {
          first_name: "Rachel",
          last_name: "Keane",
          email: "rkeane@mynes.com",
          phone: "+447408545978"
        },
        deliver_to_attributes: {
          first_name: "Rachel",
          last_name: "Keane",
          address1: "50 Pleasants Avenue",
          address2: "Poringland",
          city: "Norwich",
          state: "Norfolk",
          zip: "NR14 7FH",
          country: "GB", // Correct ISO country code
          phone: "+447408545978",
          email: "rkeane@mynes.com"
        },
        line_items_attributes: [
          {
            sellable_id: variant.id,
            quantity: 1,
            price_per_unit: variant.price || 50.00
          }
        ],
        customer_note: "International shipment to Rachel Keane in Norwich, UK - Testing MCP integration"
      }
    };

    console.log('📤 Order creation payload:');
    console.log(JSON.stringify(orderData, null, 2));

    const createOrderResponse = await fetch(`${VEEQO_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    console.log(`Order creation response: ${createOrderResponse.status} ${createOrderResponse.statusText}`);

    if (createOrderResponse.ok) {
      const newOrder = await createOrderResponse.json();
      console.log('✅ Order created successfully!');
      console.log(`✅ Order ID: ${newOrder.id}`);
      console.log(`✅ Status: ${newOrder.status}`);
      console.log(`✅ Customer: ${newOrder.customer?.full_name || 'Unknown'}`);

      // Check if we have allocations or need to allocate
      console.log('\n📦 Step 3: Checking/Creating allocations');

      if (newOrder.allocations && newOrder.allocations.length > 0) {
        const allocationId = newOrder.allocations[0].id;
        console.log(`✅ Allocation found: ${allocationId}`);

        // Try to get shipping quotes
        console.log('\n🚢 Step 4: Getting shipping quotes');

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
            console.log('\n📊 Available shipping options:');
            quotes.forEach((quote, index) => {
              console.log(`${index + 1}. ${quote.service_type || 'Unknown'} via ${quote.service_carrier || 'Unknown'} - Cost: ${quote.total_net_charge || 'Unknown'}`);
            });

            // Create shipment with the first quote
            const quote = quotes[0];
            console.log(`\n🚛 Step 5: Creating shipment with: ${quote.service_type} via ${quote.service_carrier}`);

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
              console.log('🎉🎉 SUCCESS! INTERNATIONAL SHIPMENT CREATED FOR RACHEL KEANE! 🎉🎉');
              console.log('\n📦 FINAL SHIPMENT DETAILS:');
              console.log(`🆔 Shipment ID: ${shipment.id || 'Unknown'}`);
              console.log(`📋 Order ID: ${newOrder.id}`);
              console.log(`🏷️  Tracking: ${shipment.tracking_number || 'Will be assigned'}`);
              console.log(`🚚 Carrier: ${shipment.service_carrier || quote.service_carrier}`);
              console.log(`📦 Service: ${shipment.service_type || quote.service_type}`);
              console.log(`💰 Cost: ${shipment.total_net_charge || quote.total_net_charge}`);
              console.log(`📊 Status: ${shipment.status || 'Created'}`);

              console.log('\n🌍 DESTINATION:');
              console.log('👤 Rachel Keane');
              console.log('🏠 50 Pleasants Avenue, Poringland');
              console.log('🌆 Norwich, Norfolk NR14 7FH');
              console.log('🇬🇧 United Kingdom');
              console.log('📞 +447408545978');
              console.log('✉️  rkeane@mynes.com');

              console.log('\n✅ MCP Tool Implementation: READY FOR PRODUCTION! 🚀');

            } else {
              const shipmentError = await shipmentResponse.text();
              console.log('❌ Shipment failed:', shipmentError);
            }
          }
        } else {
          const quotesError = await quotesResponse.text();
          console.log('❌ Quotes failed:', quotesError);
        }
      } else {
        console.log('⚠️  No allocations found - order may need manual allocation');
      }

    } else {
      const orderError = await createOrderResponse.text();
      console.log('❌ Order creation failed:', orderError);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createRachelOrderAndShipment().catch(console.error);