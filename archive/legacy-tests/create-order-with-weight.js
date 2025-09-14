/**
 * Create order using existing customer with proper weight handling
 */

import { config } from 'dotenv';
config();

async function createOrderWithProperWeight() {
  console.log('📦 Creating Order with Proper Weight Handling');
  console.log('==============================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';
  const customerId = 954140755; // Rachel's customer ID

  try {
    // Get a product with proper weight
    console.log('📋 Step 1: Getting product with weight information');

    const productsResponse = await fetch(`${VEEQO_BASE_URL}/products?page_size=10`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    const products = await productsResponse.json();
    console.log(`Found ${products.length} products`);

    // Find a product with weight
    let selectedProduct = null;
    let selectedVariant = null;

    for (const product of products) {
      if (product.sellables && product.sellables.length > 0) {
        for (const variant of product.sellables) {
          if (variant.weight_grams && variant.weight_grams > 0) {
            selectedProduct = product;
            selectedVariant = variant;
            break;
          }
        }
        if (selectedProduct) break;
      }
    }

    if (!selectedProduct) {
      console.log('⚠️  No products with weight found, using first product and setting weight manually');
      selectedProduct = products[0];
      selectedVariant = selectedProduct.sellables[0];
    }

    console.log('✅ Selected product:');
    console.log(`- Product: ${selectedProduct.title}`);
    console.log(`- Variant: ${selectedVariant.title || 'Default'}`);
    console.log(`- Weight: ${selectedVariant.weight_grams || 'Not set'}g`);
    console.log(`- Price: $${selectedVariant.price || 'Not set'}`);

    // Create order using existing customer
    console.log('\n🛒 Step 2: Creating order using existing customer');

    const orderData = {
      order: {
        channel_id: 731570,
        customer_id: customerId, // Use existing customer
        line_items_attributes: [
          {
            sellable_id: selectedVariant.id,
            quantity: 1,
            price_per_unit: selectedVariant.price || 58.00
          }
        ],
        customer_note: "International shipment to Rachel Keane in Norwich, UK - MCP Integration Test"
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
      console.log(`✅ Customer: ${newOrder.customer?.full_name || 'Rachel Keane'}`);

      // Check delivery address
      if (newOrder.deliver_to) {
        console.log('🏠 Delivery Address:');
        console.log(`- Name: ${newOrder.deliver_to.first_name} ${newOrder.deliver_to.last_name}`);
        console.log(`- Address: ${newOrder.deliver_to.address1}, ${newOrder.deliver_to.city}`);
        console.log(`- Country: ${newOrder.deliver_to.country} ✅`);
      }

      // Check allocations
      if (newOrder.allocations && newOrder.allocations.length > 0) {
        const allocation = newOrder.allocations[0];
        console.log(`✅ Allocation ID: ${allocation.id}`);

        // Check allocation weight
        console.log(`✅ Allocation weight: ${allocation.total_weight || 0} ${allocation.weight_unit || 'oz'}`);

        // If weight is 0, let's try to fix it by updating the allocation package
        if (!allocation.total_weight || allocation.total_weight === 0) {
          console.log('\n🔧 Step 3: Fixing allocation weight');

          const packageUpdateData = {
            weight: 500, // 500 grams
            weight_unit: 'grams',
            width: 10,
            height: 5,
            depth: 15,
            dimensions_unit: 'inches'
          };

          const packageId = allocation.allocation_package?.id;
          if (packageId) {
            console.log(`Updating allocation package ${packageId} with weight...`);

            const updatePackageResponse = await fetch(`${VEEQO_BASE_URL}/allocation_packages/${packageId}`, {
              method: 'PUT',
              headers: {
                'x-api-key': VEEQO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ allocation_package: packageUpdateData })
            });

            console.log(`Package update response: ${updatePackageResponse.status} ${updatePackageResponse.statusText}`);

            if (updatePackageResponse.ok) {
              console.log('✅ Package weight updated successfully');
            } else {
              const updateError = await updatePackageResponse.text();
              console.log('❌ Package update failed:', updateError);
            }
          }
        }

        // Now try to get shipping quotes
        console.log('\n🚢 Step 4: Getting shipping quotes with proper weight');

        const quotesResponse = await fetch(`${VEEQO_BASE_URL}/shipping/quotes/amazon_shipping_v2?allocation_id=${allocation.id}&from_allocation_package=true`, {
          headers: {
            'x-api-key': VEEQO_API_KEY,
            'Accept': 'application/json'
          }
        });

        console.log(`Quotes response: ${quotesResponse.status} ${quotesResponse.statusText}`);

        if (quotesResponse.ok) {
          const quotes = await quotesResponse.json();
          console.log('🎉 SUCCESS! Shipping quotes retrieved!');
          console.log(`Available quotes: ${quotes.length}`);

          if (quotes.length > 0) {
            console.log('\n📊 International Shipping Options:');
            quotes.forEach((quote, index) => {
              console.log(`${index + 1}. ${quote.service_type || 'Unknown'} via ${quote.service_carrier || 'Unknown'}`);
              console.log(`   Cost: ${quote.total_net_charge || 'Unknown'} | Delivery: ${quote.delivery_estimate || 'Unknown'}`);
            });

            console.log('\n🎯 Ready to create international shipment for Rachel Keane!');
            console.log(`Order ID: ${newOrder.id}`);
            console.log(`Allocation ID: ${allocation.id}`);
            console.log(`Customer: Rachel Keane`);
            console.log(`Destination: Norwich, UK (GB)`);

            return { order: newOrder, allocation: allocation, quotes: quotes };
          }
        } else {
          const quotesError = await quotesResponse.text();
          console.log('❌ Quotes failed:', quotesError);
        }
      } else {
        console.log('⚠️  No allocations found');
      }

    } else {
      const orderError = await createOrderResponse.text();
      console.log('❌ Order creation failed:', orderError);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createOrderWithProperWeight().catch(console.error);