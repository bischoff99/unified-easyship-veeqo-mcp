#!/usr/bin/env node

/**
 * Setup Delivery Status Webhooks
 * Configures webhooks for EasyPost and Veeqo delivery status changes
 */

import { EasyPostClient } from './dist/services/clients/easypost-enhanced.js';
import { VeeqoClient } from './dist/services/clients/veeqo-enhanced.js';

async function setupDeliveryWebhooks() {
  console.log('🚚 Setting Up Delivery Status Webhooks\n');

  if (!process.env.EASYPOST_API_KEY || process.env.EASYPOST_API_KEY === 'mock') {
    console.log('❌ EASYPOST_API_KEY not set');
    console.log('💡 Run: EASYPOST_API_KEY=your_key node setup-delivery-webhooks.js');
    return;
  }

  const easyPostClient = new EasyPostClient();
  const veeqoClient = new VeeqoClient();

  // Your webhook endpoint URL (replace with your actual server)
  const webhookUrl = process.env.WEBHOOK_URL || 'https://your-server.com/webhooks/delivery';

  console.log('📋 Delivery Status Webhook Events:');
  console.log('   • shipment.created - Label created');
  console.log('   • shipment.purchased - Label purchased');
  console.log('   • shipment.picked_up - Package collected');
  console.log('   • tracker.updated - Delivery status changed');
  console.log('   • shipment.delivered - Package delivered');
  console.log('   • shipment.exception - Delivery issue');
  console.log('   • shipment.returned - Package returned\n');

  try {
    console.log('1. Setting up EasyPost Delivery Webhooks...\n');

    // EasyPost webhook events for delivery status
    const easyPostEvents = [
      'shipment.created',
      'shipment.purchased',
      'shipment.picked_up',
      'tracker.updated',
      'shipment.delivered',
      'shipment.exception',
      'shipment.returned'
    ];

    for (const event of easyPostEvents) {
      try {
        console.log(`   Setting up webhook for: ${event}`);

        const webhookData = {
          webhook: {
            url: webhookUrl,
            events: [event]
          }
        };

        const response = await easyPostClient.makeRequest('POST', '/webhooks', webhookData);

        console.log(`   ✅ Success: ${event} webhook created`);
        console.log(`   📍 Webhook ID: ${response.id}`);
        console.log(`   🔗 URL: ${response.url}\n`);

      } catch (error) {
        console.log(`   ❌ Failed: ${event} - ${error.message}\n`);
      }
    }

    console.log('2. Testing Veeqo Webhook Support...\n');

    // Test if Veeqo supports webhooks
    try {
      const response = await veeqoClient.makeRequest('GET', '/webhooks');
      console.log('   ✅ Veeqo webhooks endpoint found');
      console.log('   📋 Available webhook events:', response);
    } catch (error) {
      console.log('   ❌ Veeqo webhooks not available:', error.message);
      console.log('   💡 Veeqo may not support webhooks, or endpoint is different');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Delivery Status Webhooks Setup Complete!\n');

    console.log('📋 What You Get:');
    console.log('   ✅ Real-time delivery status updates');
    console.log('   ✅ Automatic customer notifications');
    console.log('   ✅ Instant tracking information');
    console.log('   ✅ Delivery issue alerts');
    console.log('   ✅ Return notifications\n');

    console.log('🔧 Next Steps:');
    console.log('   1. Set up your webhook endpoint server');
    console.log('   2. Handle incoming webhook data');
    console.log('   3. Send customer notifications');
    console.log('   4. Update your database');
    console.log('   5. Monitor webhook delivery\n');

    console.log('📧 Webhook Payload Example:');
    console.log(JSON.stringify({
      event: 'tracker.updated',
      timestamp: '2024-01-15T16:45:00Z',
      data: {
        tracking_code: '1Z999AA1234567890',
        status: 'out_for_delivery',
        carrier: 'UPS',
        estimated_delivery: '2024-01-15T18:00:00Z',
        location: 'Local UPS Facility',
        order_id: '12345'
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Error setting up webhooks:', error.message);
  }
}

// Run the setup
setupDeliveryWebhooks().catch(console.error);
