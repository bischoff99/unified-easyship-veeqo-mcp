#!/usr/bin/env node

/**
 * Direct EasyPost API Test
 * Tests the EasyPost client directly without MCP
 */

import { EasyPostClient } from "./dist/services/clients/easypost-enhanced.js";

async function testEasyPostDirect() {
  console.log("🧪 Testing EasyPost Client Directly...\n");

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
    email: "emily.carter@apricotlane-lv.tk",
  };

  const toAddress = {
    name: "John Smith",
    street1: "123 Main Street",
    city: "London",
    state: "England",
    zip: "SW1A 1AA",
    country: "GB",
    phone: "+44 20 7946 0958",
    email: "john.smith@example.com",
  };

  const parcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 1.5,
  };

  try {
    console.log("1. Testing rate calculation...");
    const rates = await client.getRates(fromAddress, toAddress, parcel, [
      "FedEx",
    ]);
    console.log("✅ Rates retrieved:", rates.length, "options");

    if (rates.length > 0) {
      console.log("\n📋 Available FedEx Rates:");
      rates.forEach((rate, index) => {
        console.log(
          `   ${index + 1}. ${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`,
        );
      });

      // Test label creation with the first FedEx rate
      const firstRate = rates[0];
      console.log(
        `\n2. Testing label creation with ${firstRate.carrier} ${firstRate.service}...`,
      );

      const label = await client.createLabel(
        toAddress,
        fromAddress,
        parcel,
        firstRate.carrier,
        firstRate.service,
      );

      console.log("✅ Label created successfully!");
      console.log("📦 Label Details:");
      console.log(`   Tracking Code: ${label.tracking_code}`);
      console.log(`   Carrier: ${label.carrier}`);
      console.log(`   Service: ${label.service}`);
      console.log(`   Rate: $${label.rate}`);
      if (label.label_url) {
        console.log(`   Label URL: ${label.label_url}`);
      }
    } else {
      console.log("❌ No rates found for FedEx");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Run the test
testEasyPostDirect().catch(console.error);
