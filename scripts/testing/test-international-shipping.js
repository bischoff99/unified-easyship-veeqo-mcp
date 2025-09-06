#!/usr/bin/env node

/**
 * Test International Shipping Configuration
 * Tests different approaches to get international shipping working
 */

import { EasyPostClient } from './dist/services/clients/easypost-enhanced.js';

async function testInternationalShipping() {
  console.log('🌍 Testing International Shipping Configuration...\n');

  const client = new EasyPostClient();

  const fromAddress = {
    name: 'Apricot Lane Boutique – Las Vegas Blue Diamond Rd',
    company: 'Apricot Lane Boutique',
    street1: '5025 Blue Diamond Rd',
    street2: 'Suite 109',
    city: 'Las Vegas',
    state: 'NV',
    zip: '89139',
    country: 'US',
    phone: '17156034341',
    email: 'emily.carter@apricotlane-lv.tk',
  };

  const parcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 1.5,
  };

  // Test different international destinations
  const testDestinations = [
    {
      name: 'John Smith',
      street1: '123 Main Street',
      city: 'London',
      state: 'England',
      zip: 'SW1A 1AA',
      country: 'GB',
      phone: '+44 20 7946 0958',
      email: 'john.smith@example.com',
    },
    {
      name: 'Marie Dubois',
      street1: '15 Rue de Rivoli',
      city: 'Paris',
      state: 'Ile-de-France',
      zip: '75001',
      country: 'FR',
      phone: '+33 1 42 36 78 90',
      email: 'marie.dubois@example.com',
    },
    {
      name: 'Hans Mueller',
      street1: 'Unter den Linden 1',
      city: 'Berlin',
      state: 'Berlin',
      zip: '10117',
      country: 'DE',
      phone: '+49 30 12345678',
      email: 'hans.mueller@example.com',
    },
    {
      name: 'Yuki Tanaka',
      street1: '1-1-1 Shibuya',
      city: 'Tokyo',
      state: 'Tokyo',
      zip: '150-0002',
      country: 'JP',
      phone: '+81 3 1234 5678',
      email: 'yuki.tanaka@example.com',
    },
  ];

  try {
    for (let i = 0; i < testDestinations.length; i++) {
      const destination = testDestinations[i];
      console.log(`\n${i + 1}. Testing ${destination.country} (${destination.city})...`);

      try {
        // Test 1: Try all carriers
        console.log('   Testing all available carriers...');
        const allRates = await client.getRates(fromAddress, destination, parcel);
        console.log(`   ✅ All carriers: ${allRates.length} rates found`);

        if (allRates.length > 0) {
          console.log('   📋 Available Rates:');
          allRates.forEach((rate, index) => {
            console.log(
              `      ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`
            );
          });

          // Try to create a label with the first available rate
          const firstRate = allRates[0];
          console.log(
            `   🏷️  Testing label creation with ${firstRate.carrier} ${firstRate.service}...`
          );

          const label = await client.createLabel(
            destination,
            fromAddress,
            parcel,
            firstRate.carrier,
            firstRate.service
          );

          console.log('   ✅ INTERNATIONAL LABEL CREATED!');
          console.log(`   📦 Tracking: ${label.tracking_code}`);
          console.log(`   💰 Cost: $${label.rate}`);
          if (label.label_url) {
            console.log(`   🖼️  Label: ${label.label_url}`);
          }
          break; // Stop after first successful international label
        }

        // Test 2: Try USPS specifically for international
        console.log('   Testing USPS International...');
        const uspsRates = await client.getRates(fromAddress, destination, parcel, ['USPS']);
        console.log(`   ✅ USPS International: ${uspsRates.length} rates found`);

        if (uspsRates.length > 0) {
          console.log('   📋 USPS International Rates:');
          uspsRates.forEach((rate, index) => {
            console.log(
              `      ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`
            );
          });
        }

        // Test 3: Try different parcel weights (sometimes weight affects international availability)
        if (allRates.length === 0) {
          console.log('   Testing with lighter parcel (0.5 lbs)...');
          const lightParcel = { ...parcel, weight: 0.5 };
          const lightRates = await client.getRates(fromAddress, destination, lightParcel);
          console.log(`   ✅ Light parcel: ${lightRates.length} rates found`);

          if (lightRates.length > 0) {
            console.log('   📋 Light Parcel Rates:');
            lightRates.forEach((rate, index) => {
              console.log(
                `      ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`
              );
            });
          }
        }
      } catch (error) {
        console.log(`   ❌ Error for ${destination.country}: ${error.message}`);
      }
    }

    // Test 4: Check EasyPost account configuration
    console.log('\n🔧 Checking EasyPost Configuration...');
    console.log('   If no international rates are found, you may need to:');
    console.log('   1. Enable international shipping in your EasyPost account');
    console.log('   2. Add FedEx/DHL accounts to EasyPost');
    console.log('   3. Configure customs information');
    console.log('   4. Verify your account has international shipping permissions');
  } catch (error) {
    console.error('❌ General Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testInternationalShipping().catch(console.error);
