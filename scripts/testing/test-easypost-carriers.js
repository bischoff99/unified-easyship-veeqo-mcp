#!/usr/bin/env node

/**
 * Test EasyPost Carriers and Rates
 * Tests different carriers and domestic vs international
 */

import { EasyPostClient } from './dist/services/clients/easypost-enhanced.js';

async function testCarriers() {
  console.log('🧪 Testing EasyPost Carriers...\n');

  const client = new EasyPostClient();

  // Test 1: Domestic US shipping
  console.log('1. Testing DOMESTIC US shipping...');
  const domesticFrom = {
    name: "Apricot Lane Boutique",
    street1: "5025 Blue Diamond Rd",
    street2: "Suite 109",
    city: "Las Vegas",
    state: "NV",
    zip: "89139",
    country: "US"
  };

  const domesticTo = {
    name: "John Smith",
    street1: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US"
  };

  const parcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 1.5
  };

  try {
    // Test all carriers for domestic
    const domesticRates = await client.getRates(domesticFrom, domesticTo, parcel);
    console.log('✅ Domestic rates retrieved:', domesticRates.length, 'options');

    if (domesticRates.length > 0) {
      console.log('\n📋 Domestic Rates:');
      domesticRates.forEach((rate, index) => {
        console.log(`   ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`);
      });
    }

    // Test 2: International shipping with different carriers
    console.log('\n2. Testing INTERNATIONAL shipping...');
    const internationalTo = {
      name: "John Smith",
      street1: "123 Main Street",
      city: "London",
      state: "England",
      zip: "SW1A 1AA",
      country: "GB"
    };

    // Test USPS for international
    const uspsRates = await client.getRates(domesticFrom, internationalTo, parcel, ['USPS']);
    console.log('✅ USPS International rates:', uspsRates.length, 'options');

    if (uspsRates.length > 0) {
      console.log('\n📋 USPS International Rates:');
      uspsRates.forEach((rate, index) => {
        console.log(`   ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`);
      });

      // Try to create a USPS label
      const firstRate = uspsRates[0];
      console.log(`\n3. Testing USPS label creation...`);

      const label = await client.createLabel(
        internationalTo,
        domesticFrom,
        parcel,
        firstRate.carrier,
        firstRate.service
      );

      console.log('✅ USPS Label created successfully!');
      console.log('📦 Label Details:');
      console.log(`   Tracking Code: ${label.tracking_code}`);
      console.log(`   Carrier: ${label.carrier}`);
      console.log(`   Service: ${label.service}`);
      console.log(`   Rate: $${label.rate}`);
    }

    // Test 3: Check what carriers are available
    console.log('\n4. Testing all available carriers...');
    const allRates = await client.getRates(domesticFrom, internationalTo, parcel);
    console.log('✅ All carrier rates:', allRates.length, 'options');

    if (allRates.length > 0) {
      const carriers = [...new Set(allRates.map(rate => rate.carrier))];
      console.log('\n📋 Available Carriers:', carriers.join(', '));
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
testCarriers().catch(console.error);
