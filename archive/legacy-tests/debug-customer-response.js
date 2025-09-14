/**
 * Debug customer response to see actual field structure
 */

import { config } from 'dotenv';
config();

async function debugCustomerResponse() {
  console.log('🔍 Debugging Customer Response Structure');
  console.log('=======================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';
  const customerId = 954140755;

  try {
    const response = await fetch(`${VEEQO_BASE_URL}/customers/${customerId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const customer = await response.json();

      console.log('📋 Full Customer Response:');
      console.log(JSON.stringify(customer, null, 2));

      console.log('\n🔍 Available Name Fields:');
      console.log(`- first_name: "${customer.first_name}"`);
      console.log(`- last_name: "${customer.last_name}"`);
      console.log(`- full_name: "${customer.full_name}"`);
      console.log(`- email: "${customer.email}"`);
      console.log(`- phone: "${customer.phone}"`);

      console.log('\n🏠 Address Structure:');
      if (customer.shipping_addresses && customer.shipping_addresses.length > 0) {
        const addr = customer.shipping_addresses[0];
        console.log('Shipping address fields:');
        console.log(`- first_name: "${addr.first_name}"`);
        console.log(`- last_name: "${addr.last_name}"`);
      }

      if (customer.billing_address) {
        console.log('Billing address fields:');
        console.log(`- first_name: "${customer.billing_address.first_name}"`);
        console.log(`- last_name: "${customer.billing_address.last_name}"`);
      }

    } else {
      const error = await response.text();
      console.log('❌ Failed to get customer:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugCustomerResponse().catch(console.error);