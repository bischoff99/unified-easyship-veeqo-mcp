#!/usr/bin/env node

/**
 * Calculate Shipping Rates - NYC to Italy
 * Uses the unified EasyPost-Veeqo MCP server to get shipping rates
 * for an international shipment from New York to Italy
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function calculateShippingRates() {
  console.log('🚚 Calculating Shipping Rates: NYC to Italy\n');
  console.log('From: Adventure Alley Toys (Queens Village, NY)');
  console.log('To: Jacopo Borsi (Manfredonia, Italy)');
  console.log('Package: 13" x 13" x 7", 3 lbs\n');
  console.log('='.repeat(60) + '\n');

  // The addresses and parcel information from the user's request
  const fromAddress = {
    name: 'Chloe Palmer',
    company: 'Adventure Alley Toys',
    street1: '94-22 215th St',
    city: 'Queens Village',
    state: 'NY',
    zip: '11428',
    country: 'US',
    phone: '6468459235',
    email: 'chloepalmer@aatoys.com'
  };

  const toAddress = {
    name: 'Jacopo Borsi',
    street1: 'Via della croce 38',
    city: 'Manfredonia',
    state: 'FG',
    zip: '71043',
    country: 'IT',
    phone: '+39 338 276 1263',
    email: 'jacopoborsi@gmail.com'
  };

  const parcel = {
    length: 13,
    width: 13,
    height: 7,
    weight: 3
  };

  // Call the MCP tool to calculate shipping rates
  console.log('📍 Route: International Shipping (US → Italy)');
  console.log('🎯 This will test international shipping capabilities\n');

  await callMCPTool('calculate_shipping_rates', {
    from_address: fromAddress,
    to_address: toAddress,
    parcel: parcel
  });

  console.log('\n' + '='.repeat(60));
  console.log('🔧 Testing optimized shipping tool for international rates...\n');

  // Also try the optimize_shipping tool which might have better international support
  await callMCPTool('optimize_shipping', {
    from_address: fromAddress,
    to_address: toAddress,
    parcel: parcel,
    preferences: {
      prioritize_cost: true,
      prioritize_speed: false,
      preferred_carriers: ['USPS', 'FedEx', 'DHL', 'UPS']
    }
  });
}

async function callMCPTool(toolName, params) {
  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, 'dist/server.js');

    console.log(`🔧 Starting MCP server: ${serverPath}`);
    console.log(`📞 Calling tool: ${toolName}\n`);

    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
        EASYPOST_API_KEY: process.env.EASYPOST_API_KEY || 'mock',
        VEEQO_API_KEY: process.env.VEEQO_API_KEY || 'mock',
        MOCK_API_CALLS: 'true'  // Use mock calls for demonstration
      }
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Also show real-time output
      process.stdout.write(text);
    });

    server.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    server.on('close', (code) => {
      console.log(`\n📊 Results Summary:`);
      console.log(`   Exit Code: ${code}`);

      if (code === 0) {
        console.log(`   ✅ Tool execution completed successfully`);
        if (output.includes('rates')) {
          console.log(`   📦 Shipping rates were calculated`);
        }
      } else {
        console.log(`   ❌ Tool execution failed`);
      }

      if (errorOutput && !errorOutput.includes('info') && !errorOutput.includes('debug')) {
        console.log(`   🚨 Errors: ${errorOutput.trim()}`);
      }

      resolve();
    });

    server.on('error', (error) => {
      console.error(`❌ Failed to start server: ${error.message}`);
      reject(error);
    });

    // Send the MCP tool call request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    console.log('📝 Request payload:');
    console.log(JSON.stringify(request, null, 2));
    console.log('\n📡 Sending request to MCP server...\n');

    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();

    // Set a timeout for the operation
    setTimeout(() => {
      if (!server.killed) {
        console.log('\n⏰ Request timed out after 30 seconds');
        server.kill('SIGTERM');
        resolve();
      }
    }, 30000);
  });
}

// Run the shipping rate calculation
console.log('🚀 Starting shipping rate calculation...\n');
calculateShippingRates()
  .then(() => {
    console.log('\n✨ Shipping rate calculation completed!');
  })
  .catch((error) => {
    console.error('\n❌ Error calculating shipping rates:', error.message);
    process.exit(1);
  });