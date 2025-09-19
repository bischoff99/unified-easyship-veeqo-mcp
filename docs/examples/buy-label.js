#!/usr/bin/env node

import { EasyPostClient } from "./dist/services/clients/easypost-enhanced.js";

// Your order data with $40.99 customs value
const orderData = {
  to_address: {
    name: "John Doe",
    company: "Acme Corp",
    street1: "123 Main St",
    city: "Sarajevo",
    state: "Sarajevo Canton",
    zip: "71000",
    country: "BA",
    phone: "555-123-4567",
    email: "john@acme.com",
  },
  from_address: {
    name: "Jane Smith",
    company: "Shipping Co",
    street1: "456 Business Ave",
    city: "Los Angeles",
    state: "CA",
    zip: "90210",
    country: "US",
    phone: "555-987-6543",
    email: "jane@shipping.com",
  },
  parcel: {
    length: 10,
    width: 8,
    height: 6,
    weight: 2.5,
  },
  customs_info: {
    customs_certify: true,
    customs_signer: "John Doe",
    contents_type: "merchandise",
    contents_explanation: "Electronics",
    eel_pfc: "NOEEI 30.37(a)",
    customs_items: [
      {
        description: "Electronic Device",
        quantity: 1,
        weight: 2.5,
        value: 40.99,
        hs_tariff_number: "8517.12.00",
        origin_country: "US",
      },
    ],
  },
};

async function buyShippingLabel() {
  console.log("🛒 Processing your order...");
  console.log("💰 Customs value: $40.99");
  console.log('📦 Package: 10" × 8" × 6", 2.5 lbs');
  console.log("📍 Route: Los Angeles, CA → Sarajevo, Bosnia");

  try {
    const client = new EasyPostClient();

    // Step 1: Get available rates
    console.log("\n🔍 Getting shipping rates...");
    const rates = await client.getRates(
      orderData.to_address,
      orderData.from_address,
      orderData.parcel,
    );

    console.log(`✅ Found ${rates.length} shipping options:`);
    rates.forEach((rate, index) => {
      console.log(
        `${index + 1}. ${rate.carrier} ${rate.service} - $${rate.rate} (${rate.delivery_days} days)`,
      );
    });

    // Step 2: Select the best rate (cheapest with good delivery time)
    const bestRate = rates.reduce((best, current) => {
      if (
        current.delivery_days <= 3 &&
        parseFloat(current.rate) < parseFloat(best.rate)
      ) {
        return current;
      }
      return best;
    }, rates[0]);

    console.log(
      `\n🎯 Selected: ${bestRate.carrier} ${bestRate.service} - $${bestRate.rate}`,
    );

    // Step 3: Create shipment with customs info
    console.log("\n📦 Creating shipment with customs declaration...");
    const shipment = await client.createShipment(
      orderData.to_address,
      orderData.from_address,
      orderData.parcel,
      orderData.customs_info,
    );

    console.log(`✅ Shipment created: ${shipment.id}`);

    // Step 4: Buy the label
    console.log("\n🏷️ Purchasing shipping label...");
    const label = await client.createLabel(
      orderData.to_address,
      orderData.from_address,
      orderData.parcel,
      bestRate.id,
      orderData.customs_info,
    );

    console.log("\n🎉 Label purchased successfully!");
    console.log("📋 Order Details:");
    console.log(`   Tracking: ${label.tracking_code}`);
    console.log(`   Carrier: ${label.carrier}`);
    console.log(`   Service: ${label.service}`);
    console.log(`   Cost: $${label.rate}`);
    console.log(`   Label URL: ${label.label_url}`);
    console.log(`   Customs Value: $40.99`);

    return label;
  } catch (error) {
    console.error("❌ Failed to purchase label:", error.message);
    throw error;
  }
}

// Run the order processing
buyShippingLabel();
