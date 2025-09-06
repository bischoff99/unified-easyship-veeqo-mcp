#!/usr/bin/env node

/**
 * Test International Shipping with MCP Server
 * Tests the new customs information structure requirement
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testInternationalMCP() {
  console.log('🌍 Testing International Shipping with MCP Server...\n');

  const serverPath = join(__dirname, 'dist/server/fastmcp-server.js');

  // Test 1: Domestic order (should work without customs)
  console.log('1. Testing Domestic Order (no customs required)...');
  await testMCPTool('create_shipping_label', {
    from_address: {
      name: "Sofia Martinez",
      company: "Melrose Trading Post Vintage",
      street1: "7850 Melrose Ave",
      city: "Los Angeles",
      state: "CA",
      zip: "90046",
      country: "US",
      phone: "12135591982",
      email: "sofia.martinez@melrosetradingpost.com"
    },
    to_address: {
      name: "John Doe",
      street1: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      phone: "12125551234",
      email: "john.doe@example.com"
    },
    parcel: {
      length: 12,
      width: 10,
      height: 8,
      weight: 2.0
    },
    carrier: "USPS",
    service: "Priority"
  });

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: International order WITHOUT customs (should fail)
  console.log('2. Testing International Order WITHOUT customs (should fail)...');
  await testMCPTool('create_shipping_label', {
    from_address: {
      name: "Sofia Martinez",
      company: "Melrose Trading Post Vintage",
      street1: "7850 Melrose Ave",
      city: "Los Angeles",
      state: "CA",
      zip: "90046",
      country: "US",
      phone: "12135591982",
      email: "sofia.martinez@melrosetradingpost.com"
    },
    to_address: {
      name: "DANOND CORKE",
      street1: "APARTMENT 3 - YORK MILL",
      street2: "WEST STREET",
      city: "SHELF HALIFAX",
      state: "WEST YORKSHIRE",
      zip: "HX3 7JQ",
      country: "GB",
      phone: "447418874913",
      email: "damondcorke8829@gmail.com"
    },
    parcel: {
      length: 12,
      width: 10,
      height: 8,
      weight: 97.6
    },
    carrier: "FedEx",
    service: "FEDEX_INTERNATIONAL_PRIORITY_EXPRESS"
  });

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: International order WITH customs (should work)
  console.log('3. Testing International Order WITH customs (should work)...');
  await testMCPTool('create_shipping_label', {
    from_address: {
      name: "Sofia Martinez",
      company: "Melrose Trading Post Vintage",
      street1: "7850 Melrose Ave",
      city: "Los Angeles",
      state: "CA",
      zip: "90046",
      country: "US",
      phone: "12135591982",
      email: "sofia.martinez@melrosetradingpost.com"
    },
    to_address: {
      name: "DANOND CORKE",
      street1: "APARTMENT 3 - YORK MILL",
      street2: "WEST STREET",
      city: "SHELF HALIFAX",
      state: "WEST YORKSHIRE",
      zip: "HX3 7JQ",
      country: "GB",
      phone: "447418874913",
      email: "damondcorke8829@gmail.com"
    },
    parcel: {
      length: 12,
      width: 10,
      height: 8,
      weight: 97.6
    },
    carrier: "FedEx",
    service: "FEDEX_INTERNATIONAL_PRIORITY_EXPRESS",
    customs_info: {
      contents_type: "merchandise",
      contents_explanation: "Vintage clothing items",
      customs_items: [
        {
          description: "Vintage clothing items",
          quantity: 4,
          weight: 97.6,
          value: 95.0,
          currency: "USD",
          origin_country: "US",
          hs_tariff_number: "6203434010"
        }
      ],
      customs_certify: true,
      customs_signer: "Sofia Martinez",
      non_delivery_option: "return",
      restriction_type: "none"
    }
  });
}

async function testMCPTool(toolName, params) {
  return new Promise((resolve) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      console.log(`   Tool: ${toolName}`);
      console.log(`   Parameters: ${JSON.stringify(params, null, 2)}`);
      console.log(`   Exit Code: ${code}`);

      if (output) {
        console.log(`   Output: ${output.trim()}`);
      }

      if (errorOutput) {
        console.log(`   Error: ${errorOutput.trim()}`);
      }

      resolve();
    });

    // Send the tool call
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

// Run the test
testInternationalMCP().catch(console.error);
