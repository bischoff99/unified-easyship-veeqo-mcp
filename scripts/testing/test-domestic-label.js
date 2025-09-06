#!/usr/bin/env node

/**
 * Test Domestic Label Creation
 * Creates a real domestic shipping label
 */

import { EasyPostClient } from './dist/services/clients/easypost-enhanced.js';

async function testDomesticLabel() {
  console.log('🧪 Testing DOMESTIC Label Creation...\n');

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
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US",
    phone: "555-123-4567",
    email: "john.smith@example.com"
  };

  const parcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 1.5
  };

  try {
    console.log('1. Getting domestic rates...');
    const rates = await client.getRates(fromAddress, toAddress, parcel, ['USPS']);
    console.log('✅ Rates retrieved:', rates.length, 'options');

    if (rates.length > 0) {
      console.log('\n📋 Available USPS Rates:');
      rates.forEach((rate, index) => {
        console.log(`   ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`);
      });

      // Create label with USPS Priority (cheapest option)
      const priorityRate = rates.find(rate => rate.service.includes('Priority'));
      if (priorityRate) {
        console.log(`\n2. Creating USPS Priority label...`);
        console.log(`   Rate: ${priorityRate.carrier} ${priorityRate.service} - $${priorityRate.rate}`);

        const label = await client.createLabel(
          toAddress,
          fromAddress,
          parcel,
          priorityRate.carrier,
          priorityRate.service
        );

        console.log('\n✅ LABEL CREATED SUCCESSFULLY!');
        console.log('📦 Label Details:');
        console.log(`   Tracking Code: ${label.tracking_code}`);
        console.log(`   Carrier: ${label.carrier}`);
        console.log(`   Service: ${label.service}`);
        console.log(`   Rate: $${label.rate}`);
        if (label.label_url) {
          console.log(`   Label URL: ${label.label_url}`);
        }
        if (label.postage_label) {
          console.log(`   Postage Label: ${label.postage_label.label_url || 'Available'}`);
        }

        console.log('\n🎉 REAL LABEL PURCHASED! Check your EasyPost account for charges.');
      }
    } else {
      console.log('❌ No rates found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testDomesticLabel().catch(console.error);
