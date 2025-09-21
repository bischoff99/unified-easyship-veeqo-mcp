#!/usr/bin/env node

import { VeeqoClient } from "../dist/services/clients/veeqo-enhanced.js";

async function debugCustomerFix() {
  try {
    console.log("🔍 Debugging Customer Fix Logic...\n");

    const apiKey = process.env.VEEQO_API_KEY;

    if (!apiKey) {
      console.error("❌ VEEQO_API_KEY environment variable is required");
      process.exit(1);
    }

    const veeqoClient = new VeeqoClient(apiKey);
    const customers = await veeqoClient.getCustomers({ limit: 100 });

    customers.forEach((customer, index) => {
      console.log(`\n${index + 1}. Customer ${customer.id}:`);
      console.log(`   First Name: "${customer.first_name}"`);
      console.log(`   Last Name: "${customer.last_name}"`);
      console.log(`   Full Name: "${customer.full_name}"`);

      // Test the hasGoodNames logic
      const firstName = customer.first_name ? customer.first_name.trim() : "";
      const lastName = customer.last_name ? customer.last_name.trim() : "";

      console.log(`   Testing hasGoodNames("${firstName}", "${lastName}"):`);

      if (!firstName || !lastName) {
        console.log("   ❌ Missing names - NEEDS FIX");
      } else if (lastName === "Customer") {
        console.log("   ❌ Generic Customer name - NEEDS FIX");
      } else if (firstName === lastName) {
        console.log("   ❌ Same first and last name - NEEDS FIX");
      } else if (firstName.toLowerCase() === lastName.toLowerCase()) {
        console.log("   ❌ Same names (case insensitive) - NEEDS FIX");
      } else if (lastName.length < 2) {
        console.log("   ❌ Last name too short - NEEDS FIX");
      } else {
        console.log("   ✅ Good names - NO FIX NEEDED");
      }
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugCustomerFix();
