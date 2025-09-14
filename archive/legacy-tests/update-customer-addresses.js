/**
 * Update Rachel Keane customer with both shipping and billing addresses
 */

import { config } from 'dotenv';
config();

async function updateCustomerWithBothAddresses() {
  console.log('🏠 Updating Customer with Shipping and Billing Addresses');
  console.log('========================================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';
  const customerId = 954140755; // Rachel's customer ID from previous step

  try {
    // First, get current customer details
    console.log('📋 Step 1: Getting current customer details');

    const getResponse = await fetch(`${VEEQO_BASE_URL}/customers/${customerId}`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (getResponse.ok) {
      const currentCustomer = await getResponse.json();
      console.log('✅ Current customer retrieved');
      console.log(`- Shipping addresses: ${currentCustomer.shipping_addresses?.length || 0}`);
      console.log(`- Has billing address: ${!!currentCustomer.billing_address}`);
    }

    // Update customer with both shipping and billing addresses
    console.log('\n🔧 Step 2: Updating customer with complete address information');

    const updateData = {
      customer: {
        first_name: "Rachel",
        last_name: "Keane",
        email: "rkeane@mynes.com",
        phone: "+447408545978",
        customer_type: "retail",
        // Shipping address
        shipping_addresses_attributes: [
          {
            first_name: "Rachel",
            last_name: "Keane",
            address1: "50 Pleasants Avenue",
            address2: "Poringland",
            city: "Norwich",
            state: "Norfolk",
            zip: "NR14 7FH",
            country: "GB",
            phone: "+447408545978",
            email: "rkeane@mynes.com",
            is_default: true
          }
        ],
        // Billing address (same as shipping for this case)
        billing_address_attributes: {
          first_name: "Rachel",
          last_name: "Keane",
          address1: "50 Pleasants Avenue",
          address2: "Poringland",
          city: "Norwich",
          state: "Norfolk",
          zip: "NR14 7FH",
          country: "GB",
          phone: "+447408545978",
          email: "rkeane@mynes.com"
        }
      }
    };

    console.log('📤 Customer update payload:');
    console.log(JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch(`${VEEQO_BASE_URL}/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    console.log(`\nCustomer update response: ${updateResponse.status} ${updateResponse.statusText}`);

    if (updateResponse.ok) {
      const updatedCustomer = await updateResponse.json();
      console.log('✅ Customer updated successfully with both addresses!');

      // Verify the addresses
      console.log('\n📋 Updated Customer Details:');
      console.log(`🆔 Customer ID: ${updatedCustomer.id}`);
      console.log(`👤 Name: ${updatedCustomer.first_name} ${updatedCustomer.last_name}`);
      console.log(`📧 Email: ${updatedCustomer.email}`);
      console.log(`📞 Phone: ${updatedCustomer.phone}`);

      console.log('\n🚚 Shipping Addresses:');
      if (updatedCustomer.shipping_addresses && updatedCustomer.shipping_addresses.length > 0) {
        updatedCustomer.shipping_addresses.forEach((addr, index) => {
          console.log(`  ${index + 1}. ${addr.first_name} ${addr.last_name}`);
          console.log(`     ${addr.address1}${addr.address2 ? ', ' + addr.address2 : ''}`);
          console.log(`     ${addr.city}, ${addr.state} ${addr.zip}`);
          console.log(`     ${addr.country} ${addr.is_default ? '(Default)' : ''}`);
          console.log(`     ${addr.phone}`);
        });
      } else {
        console.log('  No shipping addresses found');
      }

      console.log('\n🏦 Billing Address:');
      if (updatedCustomer.billing_address) {
        const billing = updatedCustomer.billing_address;
        console.log(`  ${billing.first_name} ${billing.last_name}`);
        console.log(`  ${billing.address1}${billing.address2 ? ', ' + billing.address2 : ''}`);
        console.log(`  ${billing.city}, ${billing.state} ${billing.zip}`);
        console.log(`  ${billing.country}`);
        console.log(`  ${billing.phone || 'No phone'}`);
      } else {
        console.log('  No billing address found');
      }

      console.log('\n✅ Customer is now ready for order creation with proper addresses!');
      console.log(`🎯 Customer ID: ${updatedCustomer.id}`);

      return updatedCustomer;

    } else {
      const updateError = await updateResponse.text();
      console.log('❌ Customer update failed:', updateError);
    }

  } catch (error) {
    console.error('❌ Error updating customer addresses:', error.message);
  }
}

updateCustomerWithBothAddresses().catch(console.error);