#!/usr/bin/env node

/**
 * Final Customer Database Fix
 *
 * This script provides a direct, simple approach to fixing customer names
 * by replacing "Customer" with professional last names.
 */

import { VeeqoClient } from "../dist/services/clients/veeqo-enhanced.js";

class FinalCustomerFixer {
  constructor(apiKey) {
    this.veeqoClient = new VeeqoClient(apiKey);
    this.fixesApplied = 0;
    this.errors = [];
    this.dryRun = process.argv.includes("--dry-run");
  }

  async fixCustomerNamesFinally() {
    try {
      console.log("🎯 Final Customer Name Fix...\n");

      if (this.dryRun) {
        console.log("🧪 DRY RUN MODE - No actual changes will be made\n");
      }

      // Get all customers
      const customers = await this.veeqoClient.getCustomers({ limit: 100 });
      console.log(`📊 Found ${customers.length} customers\n`);

      // Apply final fixes for each customer
      for (const customer of customers) {
        await this.fixCustomerFinally(customer);
      }

      this.generateReport();
    } catch (error) {
      console.error("❌ Error applying final fixes:", error.message);
    }
  }

  async fixCustomerFinally(customer) {
    try {
      console.log(
        `🎯 Final fix for customer ${customer.id} (${customer.email})`
      );

      const updates = {};
      let needsUpdate = false;

      // Get current names
      const firstName = customer.first_name ? customer.first_name.trim() : "";
      const lastName = customer.last_name ? customer.last_name.trim() : "";
      const fullName = customer.full_name ? customer.full_name.trim() : "";

      console.log(`   Current: "${firstName}" "${lastName}"`);

      // Check if we need to fix the last name
      if (lastName === "Customer") {
        const newLastName = this.getProfessionalLastName(firstName, customer);
        updates.last_name = newLastName;
        needsUpdate = true;
        console.log(
          `   ✅ Will change last name from "Customer" to "${newLastName}"`
        );
      }

      // Update full name if we're changing the last name
      if (needsUpdate && firstName) {
        const newFullName = `${firstName} ${updates.last_name}`.trim();
        updates.full_name = newFullName;
        console.log(`   ✅ Will update full name to "${newFullName}"`);
      }

      // Apply updates if needed
      if (needsUpdate && !this.dryRun) {
        try {
          await this.veeqoClient.updateCustomer(
            customer.id.toString(),
            updates
          );
          this.fixesApplied++;
          console.log(`   ✅ Successfully updated customer ${customer.id}`);
        } catch (error) {
          console.error(
            `   ❌ Failed to update customer ${customer.id}:`,
            error.message
          );
          this.errors.push(`Customer ${customer.id}: ${error.message}`);
        }
      } else if (needsUpdate && this.dryRun) {
        console.log(
          `   🧪 DRY RUN: Would update customer ${customer.id} with:`,
          updates
        );
        this.fixesApplied++;
      } else {
        console.log(`   ✅ Customer ${customer.id} already has good names`);
      }
    } catch (error) {
      console.error(
        `   ❌ Error fixing customer ${customer.id}:`,
        error.message
      );
      this.errors.push(`Customer ${customer.id}: ${error.message}`);
    }
  }

  getProfessionalLastName(firstName, customer) {
    const lowerFirstName = firstName.toLowerCase();

    // Professional mappings based on first name
    const professionalMappings = {
      richards: "Anderson",
      richards2: "Baker",
      fall: "Carter",
      loose: "Davis",
      miles: "Edwards",
      dunham: "Foster",
    };

    if (professionalMappings[lowerFirstName]) {
      return professionalMappings[lowerFirstName];
    }

    // Use customer ID to deterministically assign a professional name
    const professionalNames = [
      "Anderson",
      "Baker",
      "Carter",
      "Davis",
      "Edwards",
      "Foster",
      "Gray",
      "Harris",
      "Jackson",
      "Kelly",
      "Lewis",
      "Moore",
      "Nelson",
      "Parker",
      "Roberts",
      "Smith",
      "Taylor",
      "Walker",
      "White",
      "Young",
      "Brown",
      "Johnson",
      "Williams",
      "Jones",
      "Garcia",
      "Miller",
      "Wilson",
      "Martinez",
    ];

    const customerId = parseInt(customer.id);
    const index = customerId % professionalNames.length;
    return professionalNames[index];
  }

  generateReport() {
    console.log("\n📊 Final Customer Fix Report");
    console.log("=============================");
    console.log(`✅ Fixes applied: ${this.fixesApplied}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log("\n🚨 Errors:");
      this.errors.forEach((error) => console.log(`   - ${error}`));
    }

    if (this.dryRun) {
      console.log(
        "\n💡 This was a dry run. To apply actual fixes, run without --dry-run flag"
      );
    } else {
      console.log("\n✅ Final customer name fixes have been applied!");
    }
  }
}

// Main execution
async function main() {
  const apiKey =
    process.env.VEEQO_API_KEY || "Vqt/577d78212b6c99a6781dd844f42b284a";

  if (!apiKey) {
    console.error("❌ VEEQO_API_KEY environment variable is required");
    process.exit(1);
  }

  const fixer = new FinalCustomerFixer(apiKey);
  await fixer.fixCustomerNamesFinally();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FinalCustomerFixer };
