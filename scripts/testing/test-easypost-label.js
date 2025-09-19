#!/usr/bin/env node

/**
 * Test EasyPost Label Creation
 * Tests the create_shipping_label MCP tool
 */

import { spawn } from "child_process";

const serverPath = "./dist/server/fastmcp-server.js";

// Test data using one of the boutique locations
const testData = {
  from_address: {
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
  },
  to_address: {
    name: "John Smith",
    street1: "123 Main Street",
    city: "London",
    state: "England",
    zip: "SW1A 1AA",
    country: "GB",
    phone: "+44 20 7946 0958",
    email: "john.smith@example.com",
  },
  parcel: {
    length: 10,
    width: 8,
    height: 4,
    weight: 1.5,
  },
  carrier: "FedEx",
  service: "International Priority",
};

async function testEasyPostLabel() {
  console.log("🧪 Testing EasyPost Label Creation...\n");
  console.log("📦 Test Package Details:");
  console.log(
    `   From: ${testData.from_address.name}, ${testData.from_address.city}, ${testData.from_address.state}`,
  );
  console.log(
    `   To: ${testData.to_address.name}, ${testData.to_address.city}, ${testData.to_address.country}`,
  );
  console.log(
    `   Package: ${testData.parcel.length}" x ${testData.parcel.width}" x ${testData.parcel.height}", ${testData.parcel.weight} lbs`,
  );
  console.log(`   Carrier: ${testData.carrier} ${testData.service}\n`);

  const server = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let output = "";
  let errorOutput = "";

  server.stdout.on("data", (data) => {
    output += data.toString();
  });

  server.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  // Test 1: Initialize the server
  console.log("1. Initializing MCP server...");
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    },
  };

  server.stdin.write(JSON.stringify(initMessage) + "\n");

  // Wait for initialization
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Create shipping label
  console.log("2. Creating shipping label...");
  const createLabelMessage = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "create_shipping_label",
      arguments: testData,
    },
  };

  server.stdin.write(JSON.stringify(createLabelMessage) + "\n");

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Close the server
  server.kill("SIGTERM");

  // Wait for server to close
  await new Promise((resolve) => {
    server.on("close", resolve);
  });

  console.log("\n📊 Test Results:");
  console.log("================");

  if (output) {
    console.log("✅ Server Output:");
    console.log(output);
  }

  if (errorOutput) {
    console.log("📝 Server Logs:");
    console.log(errorOutput);
  }

  console.log("\n🎉 EasyPost label creation test completed!");
}

// Run the test
testEasyPostLabel().catch(console.error);
