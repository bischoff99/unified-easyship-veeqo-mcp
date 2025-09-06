#!/usr/bin/env node

/**
 * Test Customs Information Structure
 * Demonstrates the required input structure for international orders
 */

console.log('🌍 International Shipping Input Structure Requirements\n');

console.log('='.repeat(80));
console.log('📋 REQUIRED INPUT STRUCTURE FOR INTERNATIONAL ORDERS');
console.log('='.repeat(80));

console.log(`
🔍 AUTOMATIC DETECTION:
- The MCP server automatically detects international orders by comparing:
  from_address.country !== to_address.country

🇺🇸 DOMESTIC ORDERS (US → US):
- NO customs information required
- Standard shipping parameters only

🌍 INTERNATIONAL ORDERS (US → Any other country):
- REQUIRES customs_info object with the following structure:

{
  "contents_type": "merchandise" | "gift" | "documents" | "returned_goods" | "sample",
  "contents_explanation": "Optional description of contents",
  "customs_items": [
    {
      "description": "Detailed item description (REQUIRED)",
      "quantity": 4,                    // Number of items (REQUIRED)
      "weight": 97.6,                   // Weight in oz (REQUIRED)
      "value": 95.0,                    // Value in USD (REQUIRED)
      "currency": "USD",                // Currency code (default: USD)
      "origin_country": "US",           // Country of origin (default: US)
      "hs_tariff_number": "6203434010"  // HS code (optional but recommended)
    }
  ],
  "customs_certify": true,              // Must be true (default: true)
  "customs_signer": "Your Name",        // Name of person certifying (REQUIRED)
  "non_delivery_option": "return" | "abandon",  // What to do if undeliverable (default: return)
  "restriction_type": "none" | "other", // Any restrictions (default: none)
  "restriction_comments": "Optional comments"
}
`);

console.log('='.repeat(80));
console.log('📝 EXAMPLE: SUCCESSFUL INTERNATIONAL ORDER');
console.log('='.repeat(80));

const exampleOrder = {
  from_address: {
    name: 'Sofia Martinez',
    company: 'Melrose Trading Post Vintage',
    street1: '7850 Melrose Ave',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90046',
    country: 'US',
    phone: '12135591982',
    email: 'sofia.martinez@melrosetradingpost.com',
  },
  to_address: {
    name: 'DANOND CORKE',
    street1: 'APARTMENT 3 - YORK MILL',
    street2: 'WEST STREET',
    city: 'SHELF HALIFAX',
    state: 'WEST YORKSHIRE',
    zip: 'HX3 7JQ',
    country: 'GB', // ← This makes it international (US → GB)
    phone: '447418874913',
    email: 'damondcorke8829@gmail.com',
  },
  parcel: {
    length: 12,
    width: 10,
    height: 8,
    weight: 97.6,
  },
  carrier: 'FedEx',
  service: 'FEDEX_INTERNATIONAL_PRIORITY_EXPRESS',
  customs_info: {
    // ← REQUIRED for international orders
    contents_type: 'merchandise',
    contents_explanation: 'Vintage clothing items',
    customs_items: [
      {
        description: 'Vintage clothing items',
        quantity: 4,
        weight: 97.6,
        value: 95.0,
        currency: 'USD',
        origin_country: 'US',
        hs_tariff_number: '6203434010',
      },
    ],
    customs_certify: true,
    customs_signer: 'Sofia Martinez',
    non_delivery_option: 'return',
    restriction_type: 'none',
  },
};

console.log(JSON.stringify(exampleOrder, null, 2));

console.log('\n' + '='.repeat(80));
console.log('❌ WHAT HAPPENS WITHOUT CUSTOMS INFO');
console.log('='.repeat(80));

console.log(`
If you try to create an international order WITHOUT customs_info, the MCP server will:

1. 🌍 Detect it's international (US → GB)
2. ❌ Throw an error with detailed instructions
3. 📋 Show you exactly what structure is needed
4. 💡 Provide a complete example

Error message will include:
- Required fields explanation
- Complete example structure
- HS tariff code recommendations
`);

console.log('\n' + '='.repeat(80));
console.log('✅ WHAT HAPPENS WITH CUSTOMS INFO');
console.log('='.repeat(80));

console.log(`
If you provide proper customs_info for international orders:

1. 🌍 Detects international shipment
2. ✅ Validates customs information
3. 🚚 Creates shipment with customs
4. 📋 Gets international rates (FedEx, USPS, DHL, etc.)
5. 🏷️  Purchases label with commercial invoice
6. 📦 Ready for international shipping

Result: Full international shipping capability with compliance!
`);

console.log('\n' + '='.repeat(80));
console.log('🎯 KEY BENEFITS OF THIS STRUCTURE');
console.log('='.repeat(80));

console.log(`
✅ AUTOMATIC DETECTION: No need to manually specify international vs domestic
✅ VALIDATION: Server ensures all required customs fields are provided
✅ COMPLIANCE: Meets international shipping regulations automatically
✅ FLEXIBILITY: Supports all major international carriers
✅ DOCUMENTATION: Clear error messages guide proper usage
✅ STANDARDIZATION: Consistent structure across all international orders

This structure ensures your boutique network can ship internationally
with full compliance and proper documentation! 🌍✨
`);

console.log('\n' + '='.repeat(80));
console.log('🚀 READY FOR INTERNATIONAL SHIPPING!');
console.log('='.repeat(80));
