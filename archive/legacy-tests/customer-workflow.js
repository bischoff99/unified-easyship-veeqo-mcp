/**
 * Create/Get/Put customer using Veeqo customers endpoint
 */

import { config } from 'dotenv';
config();

async function customerWorkflow() {
  console.log('👤 Veeqo Customer Management Workflow');
  console.log('=====================================');

  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  const VEEQO_BASE_URL = 'https://api.veeqo.com';

  try {
    // Step 1: Check if Rachel Keane already exists
    console.log('🔍 Step 1: Checking if Rachel Keane already exists');

    const searchResponse = await fetch(`${VEEQO_BASE_URL}/customers?email=rkeane@mynes.com`, {
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Accept': 'application/json'
      }
    });

    console.log(`Customer search response: ${searchResponse.status} ${searchResponse.statusText}`);

    let customer;

    if (searchResponse.ok) {
      const existingCustomers = await searchResponse.json();
      console.log(`Found ${existingCustomers.length} existing customers with email rkeane@mynes.com`);

      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
        console.log('✅ Existing customer found:');
        console.log(`- ID: ${customer.id}`);
        console.log(`- Name: ${customer.full_name || `${customer.first_name} ${customer.last_name}`}`);
        console.log(`- Email: ${customer.email}`);

        // Step 2: Update existing customer with complete address
        console.log('\n🔧 Step 2: Updating existing customer with Rachel\'s complete address');

        const updateData = {
          customer: {
            first_name: "Rachel",
            last_name: "Keane",
            email: "rkeane@mynes.com",
            phone: "+447408545978",
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
            ]
          }
        };

        const updateResponse = await fetch(`${VEEQO_BASE_URL}/customers/${customer.id}`, {
          method: 'PUT',
          headers: {
            'x-api-key': VEEQO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        console.log(`Customer update response: ${updateResponse.status} ${updateResponse.statusText}`);

        if (updateResponse.ok) {
          customer = await updateResponse.json();
          console.log('✅ Customer updated successfully!');
        } else {
          const updateError = await updateResponse.text();
          console.log('❌ Customer update failed:', updateError);
        }
      }
    }

    // Step 3: Create new customer if none exists
    if (!customer) {
      console.log('\n👤 Step 3: Creating new customer for Rachel Keane');

      const customerData = {
        customer: {
          first_name: "Rachel",
          last_name: "Keane",
          email: "rkeane@mynes.com",
          phone: "+447408545978",
          customer_type: "retail",
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

      console.log('📤 Customer creation payload:');
      console.log(JSON.stringify(customerData, null, 2));

      const createResponse = await fetch(`${VEEQO_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'x-api-key': VEEQO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      console.log(`Customer creation response: ${createResponse.status} ${createResponse.statusText}`);

      if (createResponse.ok) {
        customer = await createResponse.json();
        console.log('✅ Customer created successfully!');
      } else {
        const createError = await createResponse.text();
        console.log('❌ Customer creation failed:', createError);
        return;
      }
    }

    // Step 4: Display final customer details
    console.log('\n📋 Final Customer Details:');
    console.log(`🆔 Customer ID: ${customer.id}`);
    console.log(`👤 Name: ${customer.full_name || `${customer.first_name} ${customer.last_name}`}`);
    console.log(`📧 Email: ${customer.email}`);
    console.log(`📞 Phone: ${customer.phone}`);
    console.log(`🏠 Addresses: ${customer.shipping_addresses?.length || 0} shipping, has billing: ${!!customer.billing_address}`);

    if (customer.shipping_addresses && customer.shipping_addresses.length > 0) {
      const address = customer.shipping_addresses[0];
      console.log('\n🏠 Primary Shipping Address:');
      console.log(`${address.first_name} ${address.last_name}`);
      console.log(`${address.address1}`);
      if (address.address2) console.log(`${address.address2}`);
      console.log(`${address.city}, ${address.state} ${address.zip}`);
      console.log(`${address.country}`);
      console.log(`${address.phone}`);
    }

    console.log('\n✅ Customer workflow completed - Ready for order creation!');
    console.log(`🎯 Customer ID ${customer.id} can be used for creating Rachel's international shipment order`);

    return customer;

  } catch (error) {
    console.error('❌ Customer workflow error:', error.message);
  }
}

customerWorkflow().catch(console.error);