/**
 * Real API Integration Test
 * Test actual EasyPost and Veeqo APIs with real credentials
 */

import { config } from 'dotenv';
import { EasyPostClient } from './dist/services/clients/easypost-enhanced.js';
import { VeeqoClient } from './dist/services/clients/veeqo-enhanced.js';

// Load environment variables
config();

async function testEasyPostAPI() {
  console.log('🚀 Testing EasyPost API...');

  const client = new EasyPostClient();

  // Test address validation
  const testAddress = {
    name: 'John Doe',
    street1: '1 E Main St',
    city: 'Mesa',
    state: 'AZ',
    zip: '85201',
    country: 'US'
  };

  try {
    console.log('📍 Testing address validation...');
    const validatedAddress = await client.verifyAddress(testAddress);
    console.log('✅ Address validation successful:', validatedAddress);
  } catch (error) {
    console.log('❌ Address validation failed:', error.message);
  }

  // Test parcel presets
  try {
    console.log('📦 Testing parcel presets...');
    const presets = await client.getParcelPresets();
    console.log('✅ Parcel presets retrieved:', presets.length, 'presets');
  } catch (error) {
    console.log('❌ Parcel presets failed:', error.message);
  }

  // Test shipping rates
  const testParcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 16
  };

  const fromAddress = {
    name: 'Sender',
    street1: '388 Townsend St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    country: 'US'
  };

  const toAddress = {
    name: 'Recipient',
    street1: '1 E Main St',
    city: 'Mesa',
    state: 'AZ',
    zip: '85201',
    country: 'US'
  };

  try {
    console.log('💰 Testing shipping rates...');
    const rates = await client.getRates(fromAddress, toAddress, testParcel);
    console.log('✅ Shipping rates retrieved:', rates.length, 'rates');

    if (rates.length > 0) {
      console.log('📊 Sample rates:');
      rates.slice(0, 3).forEach(rate => {
        console.log(`  ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`);
      });
    }
  } catch (error) {
    console.log('❌ Shipping rates failed:', error.message);
  }
}

async function testVeeqoAPI() {
  console.log('\n🚀 Testing Veeqo API...');

  const client = new VeeqoClient();

  // Test inventory levels
  try {
    console.log('📦 Testing inventory levels...');
    const inventory = await client.getInventoryLevels(); // Get inventory levels
    console.log('✅ Inventory levels retrieved:', inventory.length, 'items');

    if (inventory.length > 0) {
      console.log('📊 Sample inventory:');
      inventory.slice(0, 3).forEach(item => {
        console.log(`  Product ${item.product_id}: ${item.quantity} units at ${item.location_name}`);
      });
    }
  } catch (error) {
    console.log('❌ Inventory levels failed:', error.message);
  }

  // Test products
  try {
    console.log('🛍️ Testing products...');
    const products = await client.getProducts(5); // Get first 5 products
    console.log('✅ Products retrieved:', products.length, 'products');

    if (products.length > 0) {
      console.log('📊 Sample products:');
      products.slice(0, 3).forEach(product => {
        console.log(`  ${product.title}: ${product.sellable_on_hand} units`);
      });
    }
  } catch (error) {
    console.log('❌ Products failed:', error.message);
  }

  // Test carriers
  try {
    console.log('🚛 Testing carriers...');
    const carriers = await client.getCarriers();
    console.log('✅ Carriers retrieved:', carriers.length, 'carriers');

    if (carriers.length > 0) {
      console.log('📊 Available carriers:');
      carriers.slice(0, 5).forEach(carrier => {
        console.log(`  ${carrier.name || carrier.title || 'Unknown'}`);
      });
    }
  } catch (error) {
    console.log('❌ Carriers failed:', error.message);
  }
}

async function main() {
  console.log('🧪 Real API Integration Test');
  console.log('================================');

  console.log('🔧 Configuration:');
  console.log('  EasyPost API:', process.env.EASYPOST_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('  Veeqo API:', process.env.VEEQO_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('');

  if (!process.env.EASYPOST_API_KEY || process.env.EASYPOST_API_KEY === 'mock') {
    console.log('⚠️ EasyPost API key not configured for real testing');
  } else {
    await testEasyPostAPI();
  }

  if (!process.env.VEEQO_API_KEY || process.env.VEEQO_API_KEY === 'mock') {
    console.log('⚠️ Veeqo API key not configured for real testing');
  } else {
    await testVeeqoAPI();
  }

  console.log('\n✅ API Integration Test Complete!');
}

main().catch(console.error);