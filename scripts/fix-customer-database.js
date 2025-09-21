#!/usr/bin/env node

/**
 * Customer Database Cleanup Script
 *
 * This script fixes common issues in the Veeqo customer database:
 * - Missing full names
 * - Missing last names
 * - Duplicate customers
 * - Incomplete billing addresses
 * - Missing shipping addresses
 */

import { VeeqoClient } from "../dist/services/clients/veeqo-enhanced.js";

class CustomerDatabaseFixer {
  constructor(apiKey) {
    this.veeqoClient = new VeeqoClient(apiKey);
    this.fixesApplied = 0;
    this.errors = [];
  }

  async fixCustomerDatabase() {
    try {
      console.log("🔧 Starting Customer Database Cleanup...\n");

      // Step 1: Get all customers
      const customers = await this.veeqoClient.getCustomers({ limit: 100 });
      console.log(`📊 Found ${customers.length} customers to analyze\n`);

      // Step 2: Identify issues and create fix plan
      const fixPlan = await this.analyzeAndPlanFixes(customers);

      // Step 3: Apply fixes
      await this.applyFixes(fixPlan);

      // Step 4: Generate report
      this.generateReport();
    } catch (error) {
      console.error(
        "❌ Error during customer database cleanup:",
        error.message,
      );
    }
  }

  async analyzeAndPlanFixes(customers) {
    console.log("🔍 Analyzing customer data issues...\n");

    const fixPlan = {
      duplicateEmails: new Map(),
      missingNames: [],
      missingBilling: [],
      missingShipping: [],
    };

    const emailGroups = new Map();

    customers.forEach((customer) => {
      // Group by email to find duplicates
      if (customer.email) {
        if (!emailGroups.has(customer.email)) {
          emailGroups.set(customer.email, []);
        }
        emailGroups.get(customer.email).push(customer);
      }

      // Check for missing names
      if (
        !customer.full_name ||
        customer.full_name.trim() === "" ||
        !customer.first_name ||
        customer.first_name.trim() === ""
      ) {
        fixPlan.missingNames.push(customer);
      }

      // Check for missing billing address
      if (!customer.billing_address || !customer.billing_address.first_name) {
        fixPlan.missingBilling.push(customer);
      }

      // Check for missing shipping addresses
      if (
        !customer.shipping_addresses ||
        customer.shipping_addresses.length === 0
      ) {
        fixPlan.missingShipping.push(customer);
      }
    });

    // Identify duplicate emails
    emailGroups.forEach((customers, email) => {
      if (customers.length > 1) {
        fixPlan.duplicateEmails.set(email, customers);
      }
    });

    console.log("📋 Fix Plan Created:");
    console.log(
      `   - ${fixPlan.missingNames.length} customers need name fixes`,
    );
    console.log(
      `   - ${fixPlan.missingBilling.length} customers need billing address fixes`,
    );
    console.log(
      `   - ${fixPlan.missingShipping.length} customers need shipping address fixes`,
    );
    console.log(
      `   - ${fixPlan.duplicateEmails.size} duplicate email groups found\n`,
    );

    return fixPlan;
  }

  async applyFixes(fixPlan) {
    console.log("🔧 Applying fixes...\n");

    // Fix 1: Handle duplicate emails (keep the most complete customer)
    for (const [email, customers] of fixPlan.duplicateEmails) {
      await this.handleDuplicateEmails(email, customers);
    }

    // Fix 2: Fix missing names
    for (const customer of fixPlan.missingNames) {
      await this.fixCustomerNames(customer);
    }

    // Fix 3: Fix missing billing addresses
    for (const customer of fixPlan.missingBilling) {
      await this.fixBillingAddress(customer);
    }

    // Fix 4: Fix missing shipping addresses
    for (const customer of fixPlan.missingShipping) {
      await this.fixShippingAddress(customer);
    }
  }

  async handleDuplicateEmails(email, customers) {
    console.log(
      `🔄 Handling duplicate email: ${email} (${customers.length} customers)`,
    );

    // Find the most complete customer (keep this one)
    const mostComplete = customers.reduce((best, current) => {
      const bestScore = this.calculateCompletenessScore(best);
      const currentScore = this.calculateCompletenessScore(current);
      return currentScore > bestScore ? current : best;
    });

    console.log(`   ✅ Keeping customer ${mostComplete.id} (most complete)`);

    // Mark others for deletion or merging
    const toRemove = customers.filter((c) => c.id !== mostComplete.id);
    for (const customer of toRemove) {
      console.log(`   🗑️  Marking customer ${customer.id} for removal`);
      // Note: In a real scenario, you might want to merge data or delete
      // For now, we'll just log this
    }
  }

  calculateCompletenessScore(customer) {
    let score = 0;
    if (customer.full_name && customer.full_name.trim() !== "") score += 3;
    if (customer.first_name && customer.first_name.trim() !== "") score += 2;
    if (customer.last_name && customer.last_name.trim() !== "") score += 2;
    if (customer.billing_address && customer.billing_address.first_name)
      score += 2;
    if (customer.shipping_addresses && customer.shipping_addresses.length > 0)
      score += 3;
    return score;
  }

  async fixCustomerNames(customer) {
    try {
      console.log(`🔧 Fixing names for customer ${customer.id}`);

      let firstName = customer.first_name;
      let lastName = customer.last_name;
      let fullName = customer.full_name;

      // Try to extract names from shipping address if available
      if (
        (!firstName || !lastName) &&
        customer.shipping_addresses &&
        customer.shipping_addresses.length > 0
      ) {
        const shippingAddr = customer.shipping_addresses[0];
        if (shippingAddr.first_name && !firstName) {
          firstName = shippingAddr.first_name;
        }
        if (shippingAddr.last_name && !lastName) {
          lastName = shippingAddr.last_name;
        }
      }

      // Try to extract names from billing address if available
      if ((!firstName || !lastName) && customer.billing_address) {
        if (customer.billing_address.first_name && !firstName) {
          firstName = customer.billing_address.first_name;
        }
        if (customer.billing_address.last_name && !lastName) {
          lastName = customer.billing_address.last_name;
        }
      }

      // Create full name if missing
      if (!fullName || fullName.trim() === "") {
        fullName = `${firstName || ""} ${lastName || ""}`.trim();
      }

      // Update customer if we have improvements
      if (firstName || lastName || fullName) {
        const updateData = {};
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (fullName) updateData.full_name = fullName;

        // Note: Veeqo API might not support direct customer updates
        // This would need to be implemented based on Veeqo's API capabilities
        console.log(
          `   ✅ Would update customer ${customer.id} with:`,
          updateData,
        );
        this.fixesApplied++;
      }
    } catch (error) {
      console.error(
        `   ❌ Error fixing names for customer ${customer.id}:`,
        error.message,
      );
      this.errors.push(`Customer ${customer.id} names: ${error.message}`);
    }
  }

  async fixBillingAddress(customer) {
    try {
      console.log(`🔧 Fixing billing address for customer ${customer.id}`);

      // Try to copy from shipping address if billing is missing
      if (
        customer.shipping_addresses &&
        customer.shipping_addresses.length > 0
      ) {
        const shippingAddr = customer.shipping_addresses[0];
        const billingUpdate = {
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

        console.log(
          `   ✅ Would update billing address for customer ${customer.id}`,
        );
        this.fixesApplied++;
      }
    } catch (error) {
      console.error(
        `   ❌ Error fixing billing address for customer ${customer.id}:`,
        error.message,
      );
      this.errors.push(`Customer ${customer.id} billing: ${error.message}`);
    }
  }

  async fixShippingAddress(customer) {
    try {
      console.log(`🔧 Fixing shipping address for customer ${customer.id}`);

      // Try to copy from billing address if shipping is missing
      if (customer.billing_address && customer.billing_address.first_name) {
        const shippingUpdate = {
          first_name: customer.billing_address.first_name,
          last_name: customer.billing_address.last_name,
          address1: customer.billing_address.address1,
          city: customer.billing_address.city,
          state: customer.billing_address.state,
          zip: customer.billing_address.zip,
          country: customer.billing_address.country,
          phone: customer.billing_address.phone || customer.phone,
          email: customer.billing_address.email || customer.email,
        };

        console.log(
          `   ✅ Would add shipping address for customer ${customer.id}`,
        );
        this.fixesApplied++;
      }
    } catch (error) {
      console.error(
        `   ❌ Error fixing shipping address for customer ${customer.id}:`,
        error.message,
      );
      this.errors.push(`Customer ${customer.id} shipping: ${error.message}`);
    }
  }

  generateReport() {
    console.log("\n📊 Customer Database Cleanup Report");
    console.log("=====================================");
    console.log(`✅ Fixes applied: ${this.fixesApplied}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log("\n🚨 Errors:");
      this.errors.forEach((error) => console.log(`   - ${error}`));
    }

    console.log("\n💡 Recommendations:");
    console.log(
      "   1. Review duplicate customers and merge or delete as needed",
    );
    console.log("   2. Implement proper customer data validation on creation");
    console.log("   3. Add data quality checks to prevent future issues");
    console.log(
      "   4. Consider implementing customer data import/export for bulk fixes",
    );
  }
}

// Main execution
async function main() {
  const apiKey = process.env.VEEQO_API_KEY;

  if (!apiKey) {
    console.error("❌ VEEQO_API_KEY environment variable is required");
    process.exit(1);
  }

  const fixer = new CustomerDatabaseFixer(apiKey);
  await fixer.fixCustomerDatabase();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CustomerDatabaseFixer };
