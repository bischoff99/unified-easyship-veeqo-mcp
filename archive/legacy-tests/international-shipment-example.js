/**
 * International Shipment Example
 * Demonstrates how to create international shipments in Veeqo
 * using the new MCP tools we implemented
 */

import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Example: Creating an International Shipment
 *
 * This demonstrates the complete workflow for international shipping:
 * 1. Create the shipment with international carrier
 * 2. Update with international tracking details
 * 3. Handle customs and export requirements
 */

async function demonstrateInternationalShipment() {
  console.log('🌍 International Shipment Workflow Example');
  console.log('==========================================');
  console.log();

  // Step 1: Create International Shipment
  console.log('📦 Step 1: Create International Shipment');
  console.log('MCP Tool: create_veeqo_shipment');
  console.log();

  const shipmentRequest = {
    order_id: 12345,
    carrier: "DHL",
    service: "DHL Express International",
    line_items: [
      {
        product_id: 101,
        variant_id: 1001,
        quantity: 2
      },
      {
        product_id: 102,
        variant_id: 1002,
        quantity: 1
      }
    ]
  };

  console.log('Request payload:');
  console.log(JSON.stringify(shipmentRequest, null, 2));
  console.log();

  // Simulated response
  const shipmentResponse = {
    id: 3456,
    order_id: 12345,
    tracking_number: "TRK-1726286400123",
    carrier: "DHL",
    service: "DHL Express International",
    status: "pending",
    line_items: [
      { id: 1, product_id: 101, variant_id: 1001, quantity: 2, allocated_quantity: 2 },
      { id: 2, product_id: 102, variant_id: 1002, quantity: 1, allocated_quantity: 1 }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('✅ Shipment Created:');
  console.log(`- Shipment ID: ${shipmentResponse.id}`);
  console.log(`- Carrier: ${shipmentResponse.carrier}`);
  console.log(`- Service: ${shipmentResponse.service}`);
  console.log(`- Items: ${shipmentResponse.line_items.length} products`);
  console.log(`- Status: ${shipmentResponse.status}`);
  console.log();

  // Step 2: Update with International Details
  console.log('🌐 Step 2: Update with International Shipping Details');
  console.log('MCP Tool: update_shipment_status');
  console.log();

  const updateRequest = {
    shipment_id: "3456",
    tracking_number: "DHL-INTL-3456-2025",
    carrier: "DHL International",
    service: "DHL Express Worldwide",
    status: "shipped",
    shipped_at: new Date().toISOString()
  };

  console.log('Update payload:');
  console.log(JSON.stringify(updateRequest, null, 2));
  console.log();

  // Simulated updated response
  const updatedResponse = {
    ...shipmentResponse,
    ...updateRequest,
    shipment_id: undefined, // Remove this field
    id: 3456,
    updated_at: new Date().toISOString()
  };

  console.log('✅ International Shipment Updated:');
  console.log(`- Tracking: ${updatedResponse.tracking_number}`);
  console.log(`- International Carrier: ${updatedResponse.carrier}`);
  console.log(`- Service Level: ${updatedResponse.service}`);
  console.log(`- Status: ${updatedResponse.status}`);
  console.log(`- Shipped At: ${new Date(updatedResponse.shipped_at).toLocaleString()}`);
  console.log();

  // Step 3: Customs Documentation
  console.log('📋 Step 3: International Shipping Requirements');
  console.log();

  console.log('Items for Customs Declaration:');
  updatedResponse.line_items.forEach((item, index) => {
    console.log(`  ${index + 1}. Product ${item.product_id} (Variant ${item.variant_id}): ${item.quantity} units`);
  });
  console.log();

  console.log('🎯 Next Steps for International Export:');
  console.log('1. Generate commercial invoice');
  console.log('2. Create customs declaration (CN22/CN23)');
  console.log('3. Calculate duties and taxes for destination country');
  console.log('4. Print international shipping labels');
  console.log('5. Prepare export documentation');
  console.log('6. Schedule DHL International pickup');
  console.log('7. Track shipment through customs clearance');
  console.log();

  console.log('🌍 International Shipment Ready for Export!');
  console.log('The shipment is now properly configured for international delivery');
  console.log(`and can be tracked using: ${updatedResponse.tracking_number}`);
}

// Additional International Shipping Features
console.log('🚀 Additional MCP Tools for International Shipping:');
console.log();
console.log('handle_partial_shipment:');
console.log('- Split international orders when items ship separately');
console.log('- Handle backorders for international customers');
console.log('- Manage customs documentation for partial shipments');
console.log();
console.log('cancel_shipment:');
console.log('- Cancel international shipments before export');
console.log('- Handle export license issues');
console.log('- Restore inventory for cancelled international orders');
console.log();
console.log('create_warehouse + manage_warehouse_routing:');
console.log('- Set up international fulfillment centers');
console.log('- Configure routing for closest international warehouse');
console.log('- Optimize shipping from regional hubs');
console.log();

// Run the demonstration
demonstrateInternationalShipment().catch(console.error);