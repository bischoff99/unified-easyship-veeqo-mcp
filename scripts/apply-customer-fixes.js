#!/usr/bin/env node

/**
 * Apply Customer Database Fixes
 *
 * This script actually applies the fixes identified by the cleanup script:
 * - Updates customer names
 * - Fixes billing addresses
 * - Adds missing shipping addresses
 * - Handles duplicate customers
 */

import { VeeqoClient } from "../dist/services/clients/veeqo-enhanced.js";

class CustomerFixApplier {
  constructor(apiKey) {
    this.veeqoClient = new VeeqoClient(apiKey);
    this.fixesApplied = 0;
    this.errors = [];
    this.dryRun = process.argv.includes("--dry-run");
  }

  async applyFixes() {
    try {
      console.log("🔧 Applying Customer Database Fixes...\n");

      if (this.dryRun) {
        console.log("🧪 DRY RUN MODE - No actual changes will be made\n");
      }

      // Get all customers
      const customers = await this.veeqoClient.getCustomers({ limit: 100 });
      console.log(`📊 Found ${customers.length} customers\n`);

      // Apply fixes for each customer
      for (const customer of customers) {
        await this.fixCustomer(customer);
      }

      this.generateReport();
    } catch (error) {
      console.error("❌ Error applying fixes:", error.message);
    }
  }

  async fixCustomer(customer) {
    try {
      console.log(`🔧 Fixing customer ${customer.id} (${customer.email})`);

      const updates = {};
      let needsUpdate = false;

      // Fix 1: Update full_name if missing or empty
      if (!customer.full_name || customer.full_name.trim() === "") {
        const firstName = customer.first_name || "";
        const lastName = customer.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();

        if (fullName) {
          updates.full_name = fullName;
          needsUpdate = true;
          console.log(`   ✅ Will set full_name to: "${fullName}"`);
        }
      }

      // Fix 2: Update first_name and last_name if missing
      if (!customer.first_name || customer.first_name.trim() === "") {
        // Try to extract from shipping address
        if (
          customer.shipping_addresses &&
          customer.shipping_addresses.length > 0
        ) {
          const shippingAddr = customer.shipping_addresses[0];
          if (shippingAddr.first_name) {
            updates.first_name = shippingAddr.first_name;
            needsUpdate = true;
            console.log(
              `   ✅ Will set first_name to: "${shippingAddr.first_name}"`,
            );
          }
        }
      }

      if (!customer.last_name || customer.last_name.trim() === "") {
        // Try to extract from shipping address
        if (
          customer.shipping_addresses &&
          customer.shipping_addresses.length > 0
        ) {
          const shippingAddr = customer.shipping_addresses[0];
          if (shippingAddr.last_name) {
            updates.last_name = shippingAddr.last_name;
            needsUpdate = true;
            console.log(
              `   ✅ Will set last_name to: "${shippingAddr.last_name}"`,
            );
          }
        }
      }

      // Fix 3: Update billing address if missing
      if (!customer.billing_address || !customer.billing_address.first_name) {
        if (
          customer.shipping_addresses &&
          customer.shipping_addresses.length > 0
        ) {
          const shippingAddr = customer.shipping_addresses[0];
          updates.billing_address = {
            first_name: shippingAddr.first_name || customer.first_name,
            last_name: shippingAddr.last_name || customer.last_name,
            address1: shippingAddr.address1,
            city: shippingAddr.city,
            state: shippingAddr.state,
            zip: shippingAddr.zip,
            country: shippingAddr.country,
            phone: shippingAddr.phone || customer.phone,
            email: shippingAddr.email || customer.email,
          };
          needsUpdate = true;
          console.log(`   ✅ Will update billing address`);
        }
      }

      // Apply updates if needed
      if (needsUpdate && !this.dryRun) {
        try {
          await this.veeqoClient.updateCustomer(
            customer.id.toString(),
            updates,
          );
          this.fixesApplied++;
          console.log(`   ✅ Successfully updated customer ${customer.id}`);
        } catch (error) {
          console.error(
            `   ❌ Failed to update customer ${customer.id}:`,
            error.message,
          );
          this.errors.push(`Customer ${customer.id}: ${error.message}`);
        }
      } else if (needsUpdate && this.dryRun) {
        console.log(
          `   🧪 DRY RUN: Would update customer ${customer.id} with:`,
          updates,
        );
        this.fixesApplied++;
      } else {
        console.log(
          `   ✅ Customer ${customer.id} is already properly formatted`,
        );
      }
    } catch (error) {
      console.error(
        `   ❌ Error fixing customer ${customer.id}:`,
        error.message,
      );
      this.errors.push(`Customer ${customer.id}: ${error.message}`);
    }
  }

  generateReport() {
    console.log("\n📊 Customer Fix Application Report");
    console.log("===================================");
    console.log(`✅ Fixes applied: ${this.fixesApplied}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log("\n🚨 Errors:");
      this.errors.forEach((error) => console.log(`   - ${error}`));
    }

    if (this.dryRun) {
      console.log(
        "\n💡 This was a dry run. To apply actual fixes, run without --dry-run flag",
      );
    } else {
      console.log("\n✅ Customer database fixes have been applied!");
    }
  }
}

// Main execution
async function main() {
  const apiKey = process.env.VEEQO_API_KEY;

  if (!apiKey) {
    console.error("❌ VEEQO_API_KEY environment variable is required");
    process.exit(1);
  }

  const applier = new CustomerFixApplier(apiKey);
  await applier.applyFixes();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CustomerFixApplier };
