#!/usr/bin/env node

/**
 * Test International Shipping with Customs Information
 * Tests if adding customs information enables international shipping
 */

import { EasyPostClient } from './dist/services/clients/easypost-enhanced.js';

async function testCustomsInfo() {
  console.log('🌍 Testing International Shipping with Customs Information...\n');

  const client = new EasyPostClient();

  const fromAddress = {
    name: "Apricot Lane Boutique – Las Vegas Blue Diamond Rd",
    company: "Apricot Lane Boutique",
    street1: "5025 Blue Diamond Rd",
    street2: "Suite 109",
    city: "Las Vegas",
    state: "NV",
    zip: "89139",
    country: "US",
    phone: "17156034341",
    email: "emily.carter@apricotlane-lv.tk"
  };

  const toAddress = {
    name: "John Smith",
    street1: "123 Main Street",
    city: "London",
    state: "England",
    zip: "SW1A 1AA",
    country: "GB",
    phone: "+44 20 7946 0958",
    email: "john.smith@example.com"
  };

  const parcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 1.5
  };

  try {
    console.log('1. Testing with customs information...');
    
    // Try to create a shipment with customs information
    const customsInfo = {
      contents_type: 'merchandise',
      contents_explanation: 'Clothing items',
      customs_items: [
        {
          description: 'Boutique clothing item',
          quantity: 1,
          weight: 1.5,
          value: 25.00,
          currency: 'USD',
          origin_country: 'US',
          hs_tariff_number: '6204.42.00' // Women's clothing HS code
        }
      ],
      customs_certify: true,
      customs_signer: 'Emily Carter',
      non_delivery_option: 'return',
      restriction_type: 'none',
      restriction_comments: '',
      customs_declaration: 'I certify that the information provided is accurate'
    };

    // Test direct API call with customs info
    console.log('   Creating shipment with customs information...');
    
    const shipmentData = {
      shipment: {
        to_address: toAddress,
        from_address: fromAddress,
        parcel: parcel,
        customs_info: customsInfo
      }
    };

    // Make direct API call to EasyPost
    const response = await client.makeRequest('POST', '/shipments', shipmentData);
    console.log('   ✅ Shipment with customs created:', response.id);
    
    if (response.rates && response.rates.length > 0) {
      console.log('   📋 International rates found:', response.rates.length);
      response.rates.forEach((rate, index) => {
        console.log(`      ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`);
      });

      // Try to buy the shipment
      const firstRate = response.rates[0];
      console.log(`   🏷️  Attempting to buy ${firstRate.carrier} ${firstRate.service}...`);
      
      const buyResponse = await client.makeRequest('POST', `/shipments/${response.id}/buy`, {
        rate: { id: firstRate.id }
      });
      
      console.log('   ✅ INTERNATIONAL LABEL CREATED!');
      console.log(`   📦 Tracking: ${buyResponse.tracking_code}`);
      console.log(`   💰 Cost: $${buyResponse.selected_rate.rate}`);
      if (buyResponse.postage_label) {
        console.log(`   🖼️  Label: ${buyResponse.postage_label.label_url}`);
      }
    } else {
      console.log('   ❌ Still no international rates with customs info');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n🔧 Next Steps to Enable International Shipping:');
  console.log('1. Log into your EasyPost dashboard');
  console.log('2. Go to Settings > Shipping');
  console.log('3. Enable "International Shipping"');
  console.log('4. Add FedEx/DHL accounts if needed');
  console.log('5. Configure customs settings');
  console.log('6. Verify your account has international permissions');
}

// Run the test
testCustomsInfo().catch(console.error);
