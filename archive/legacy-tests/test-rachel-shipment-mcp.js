/**
 * Test the MCP create_veeqo_shipment tool with Rachel's international shipment
 */

import { config } from 'dotenv';
config();

async function testRachelShipmentWithMCP() {
  console.log('🚛 Testing MCP create_veeqo_shipment tool with Rachel Keane');
  console.log('===========================================================');

  try {
    // Get one of the awaiting_fulfillment orders from our earlier test
    const testOrderId = 1037197517; // Another "awaiting_fulfillment" order

    console.log(`📦 Using Order ID: ${testOrderId}`);
    console.log('🌍 Creating international shipment to Rachel Keane in Norwich, UK');
    console.log();

    // Rachel's international shipment data
    const rachelShipmentData = {
      order_id: testOrderId,
      carrier: "DHL",
      service: "DHL Express International",
      tracking_number: `DHL-UK-${Date.now()}`,
      notify_customer: true,
      delivery_address: {
        first_name: "Rachel",
        last_name: "Keane",
        company: "",
        address_line_1: "50 Pleasants Avenue",
        address_line_2: "Poringland",
        city: "Norwich",
        state: "Norfolk",
        zip_code: "NR14 7FH",
        country: "GB",
        phone: "+447408545978",
        email: "rkeane@mynes.com"
      }
    };

    console.log('📋 Shipment Request:');
    console.log(JSON.stringify(rachelShipmentData, null, 2));
    console.log();

    // For testing purposes, we'll manually call the VeeqoClient
    // In real usage, this would be called through the MCP protocol
    const { VeeqoClient } = await import('./dist/services/clients/veeqo-enhanced.js');

    console.log('🔧 API Configuration:', {
      hasApiKey: !!process.env.VEEQO_API_KEY,
      apiKeyType: typeof process.env.VEEQO_API_KEY,
      baseUrl: process.env.VEEQO_BASE_URL
    });

    const veeqoClient = new VeeqoClient(process.env.VEEQO_API_KEY);

    console.log('🔄 Calling VeeqoClient.createShipment...');
    const result = await veeqoClient.createShipment(rachelShipmentData);

    console.log('✅ International Shipment Created Successfully!');
    console.log('================================================');
    console.log(`📦 Shipment ID: ${result.id}`);
    console.log(`🆔 Order ID: ${result.order_id}`);
    console.log(`🚚 Carrier: ${result.carrier}`);
    console.log(`📋 Service: ${result.service}`);
    console.log(`🏷️  Tracking: ${result.tracking_number}`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`📅 Created: ${new Date(result.created_at).toLocaleString()}`);
    console.log(`🚢 Shipped: ${result.shipped_at ? new Date(result.shipped_at).toLocaleString() : 'Pending'}`);
    console.log();

    console.log('🎯 Delivery Address:');
    console.log('Rachel Keane');
    console.log('50 Pleasants Avenue, Poringland');
    console.log('Norwich, Norfolk NR14 7FH');
    console.log('United Kingdom');
    console.log('+447408545978');
    console.log('rkeane@mynes.com');
    console.log();

    console.log('🌍 International Shipment Ready!');
    console.log('The shipment has been successfully created in Veeqo and is ready for DHL pickup.');
    console.log(`Track at: https://www.dhl.com/track?tracking=${result.tracking_number}`);

  } catch (error) {
    console.error('❌ Error creating international shipment:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testRachelShipmentWithMCP().catch(console.error);