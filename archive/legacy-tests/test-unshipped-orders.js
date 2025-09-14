/**
 * Find unshipped orders that can be used for shipment testing
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

  const response = await fetch(`${VEEQO_BASE_URL}${endpoint}`, options);
  let responseData;
  try {
    responseData = await response.json();
  } catch {
    responseData = await response.text();
  }

  return { success: response.ok, data: responseData, status: response.status };
}

async function findUnshippedOrders() {
  console.log('🔍 Finding orders that can be shipped');
  console.log('====================================');

  // Get orders with different filters to find unshipped ones
  const filters = [
    { name: 'Recent orders', query: '?page_size=20&sort_order=desc' },
    { name: 'Awaiting allocation', query: '?status=awaiting_allocation&page_size=10' },
    { name: 'Ready to ship', query: '?status=ready_to_ship&page_size=10' },
    { name: 'Allocated', query: '?status=allocated&page_size=10' },
    { name: 'All orders by date', query: '?page_size=50' }
  ];

  for (const filter of filters) {
    console.log(`\n📋 ${filter.name}:`);
    const result = await makeVeeqoRequest('GET', `/orders${filter.query}`);

    if (!result.success) {
      console.log(`❌ Failed: ${result.status}`);
      continue;
    }

    const orders = result.data;
    if (!orders || orders.length === 0) {
      console.log(`No orders found`);
      continue;
    }

    console.log(`Found ${orders.length} orders:`);

    orders.forEach(order => {
      console.log(`- Order ${order.id}: Status = "${order.status}" | Items: ${order.line_items?.length || 0} | Customer: ${order.customer?.first_name || 'Unknown'} ${order.customer?.last_name || ''}`);

      // Show detailed line items if available
      if (order.line_items && order.line_items.length > 0) {
        order.line_items.forEach((item, idx) => {
          console.log(`    ${idx + 1}. Product ${item.product_id} (${item.sellable_title || 'No title'}) - Qty: ${item.quantity} - Allocated: ${item.allocated_quantity || 0}`);
        });
      }
    });

    // Find the best candidate for shipping
    const shippableOrder = orders.find(order =>
      order.status && ['awaiting_allocation', 'ready_to_ship', 'allocated', 'awaiting_shipment'].includes(order.status)
    );

    if (shippableOrder) {
      console.log(`\n🎯 Found shippable order: ${shippableOrder.id} (${shippableOrder.status})`);
      return shippableOrder;
    }
  }

  console.log('\n⚠️  No shippable orders found. All orders may already be shipped or cancelled.');
  return null;
}

async function testShipmentCreationOnUnshippedOrder() {
  const order = await findUnshippedOrders();

  if (!order) {
    console.log('\n💡 Since no unshipped orders exist, let me try creating a new test order first...');

    // Try to create a test order
    const testOrderData = {
      customer: {
        first_name: "Rachel",
        last_name: "Keane",
        email: "rkeane@mynes.com",
        phone: "+447408545978"
      },
      delivery_address: {
        first_name: "Rachel",
        last_name: "Keane",
        address_line_1: "50 Pleasants Avenue",
        address_line_2: "Poringland",
        city: "Norwich",
        state: "Norfolk",
        zip_code: "NR14 7FH",
        country: "GB",
        phone: "+447408545978"
      },
      line_items: [
        {
          product_id: 1, // We'll need to get a real product ID
          quantity: 1
        }
      ]
    };

    console.log('\n🛒 Attempting to create test order for Rachel Keane...');
    const createOrderResult = await makeVeeqoRequest('POST', '/orders', testOrderData);

    if (createOrderResult.success) {
      console.log('✅ Test order created:', createOrderResult.data.id);
      return createOrderResult.data;
    } else {
      console.log('❌ Failed to create test order:', createOrderResult.status, createOrderResult.data);
      return null;
    }
  }

  return order;
}

// Run the test
testShipmentCreationOnUnshippedOrder().catch(console.error);