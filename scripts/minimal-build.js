#!/usr/bin/env node

/**
 * Minimal build script for MCP server
 * Creates a lean production build with only essential files
 */

import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

/**
 * Essential files for MCP server
 */
const ESSENTIAL_FILES = [
  "dist/server.js", // Main server entry point
  "dist/services/clients/easypost-enhanced.js", // EasyPost client
  "dist/services/clients/veeqo-enhanced.js", // Veeqo client
  "dist/server/tools/shipping.js", // Shipping tools
  "dist/server/tools/inventory.js", // Inventory tools
  "dist/server/tools/fedex-validation.js", // FedEx validation
  "dist/middleware/auth.js", // Authentication
  "dist/utils/type-safe-logger.js", // Logging
  "dist/utils/errors.js", // Error handling
];

/**
 * Files to exclude from minimal build
 */
const EXCLUDE_PATTERNS = [
  "dist/server/prompts/", // Order processing prompts (not needed for basic MCP)
  "dist/api/", // API schemas (not needed for MCP)
  "dist/config/", // Config files (not needed for MCP)
  "dist/core/", // Core utilities (not needed for MCP)
  "dist/types/", // Type definitions (not needed for runtime)
  "dist/utils/monitoring.js", // Monitoring (optional)
  "dist/utils/auth-utils.js", // Auth utilities (optional)
  "dist/utils/response-formatter.js", // Response formatter (optional)
  "dist/utils/env.js", // Environment utils (optional)
  "dist/utils/logger.js", // Basic logger (optional)
];

/**
 * Clean and create minimal build
 */
async function createMinimalBuild() {
  console.log("🧹 Creating minimal build...");

  // Clean existing dist
  try {
    await fs.rm(path.join(projectRoot, "dist"), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    console.log("ℹ️  No existing dist to clean");
  }

  // Run TypeScript compilation
  console.log("📝 Compiling TypeScript...");
  execSync("npx tsc", { cwd: projectRoot, stdio: "inherit" });

  // Create minimal dist structure
  const minimalDist = path.join(projectRoot, "dist-minimal");
  await fs.mkdir(minimalDist, { recursive: true });

  // Copy essential files
  console.log("📦 Copying essential files...");
  let copiedFiles = 0;
  let totalSize = 0;

  for (const file of ESSENTIAL_FILES) {
    try {
      const srcPath = path.join(projectRoot, file);
      const destPath = path.join(minimalDist, path.basename(file));

      await fs.copyFile(srcPath, destPath);
      const stats = await fs.stat(srcPath);
      totalSize += stats.size;
      copiedFiles++;
      console.log(
        `  ✅ ${path.basename(file)} (${(stats.size / 1024).toFixed(1)}KB)`
      );
    } catch (error) {
      console.log(`  ⚠️  ${file} not found, skipping`);
    }
  }

  // Copy package.json for dependencies
  await fs.copyFile(
    path.join(projectRoot, "package.json"),
    path.join(minimalDist, "package.json")
  );

  // Create minimal server.js that imports from current directory
  const minimalServerContent = `#!/usr/bin/env node

/**
 * Minimal MCP Server - Production Build
 * Generated: ${new Date().toISOString()}
 */

import { FastMCP } from "fastmcp";
import { authenticate } from "./auth.js";
import { EasyPostClient } from "./easypost-enhanced.js";
import { VeeqoClient } from "./veeqo-enhanced.js";
import { safeLogger as logger } from "./type-safe-logger.js";
import { addShippingTools, addInventoryTools, addFedExValidationTool } from "./shipping.js";

// Initialize minimal FastMCP server
const server = new FastMCP({
  name: "unified_easyship_veeqo_mcp",
  version: "1.0.0",
  description: "Minimal MCP server for EasyPost and Veeqo integration"
});

// Add essential tools only
await addShippingTools(server);
await addInventoryTools(server);
await addFedExValidationTool(server);

// Start server
server.serve();
`;

  await fs.writeFile(path.join(minimalDist, "server.js"), minimalServerContent);

  // Generate build summary
  const buildSummary = {
    buildTime: new Date().toISOString(),
    environment: "minimal",
    files: copiedFiles,
    totalSizeKB: Math.round(totalSize / 1024),
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    essentialFiles: ESSENTIAL_FILES.filter((f) => {
      try {
        return fs.access(path.join(projectRoot, f));
      } catch {
        return false;
      }
    }),
    excludedPatterns: EXCLUDE_PATTERNS,
  };

  await fs.writeFile(
    path.join(minimalDist, "build-summary.json"),
    JSON.stringify(buildSummary, null, 2)
  );

  console.log();
  console.log("📊 MINIMAL BUILD SUMMARY:");
  console.log("=".repeat(30));
  console.log(`✅ Files copied: ${copiedFiles}`);
  console.log(`✅ Total size: ${buildSummary.totalSizeMB} MB`);
  console.log(`✅ Build location: dist-minimal/`);
  console.log();
  console.log("🎯 ESSENTIAL FILES INCLUDED:");
  ESSENTIAL_FILES.forEach((file) => {
    console.log(`  • ${path.basename(file)}`);
  });
  console.log();
  console.log("🚫 EXCLUDED PATTERNS:");
  EXCLUDE_PATTERNS.forEach((pattern) => {
    console.log(`  • ${pattern}`);
  });
  console.log();
  console.log("🚀 READY FOR PRODUCTION!");
  console.log("   Run: cd dist-minimal && node server.js");
}

/**
 * Compare build sizes
 */
async function compareBuildSizes() {
  console.log("📊 BUILD SIZE COMPARISON:");
  console.log("=".repeat(35));

  try {
    // Get full build size
    const fullBuildSize = await getDirectorySize(
      path.join(projectRoot, "dist")
    );
    console.log(
      `📦 Full build: ${(fullBuildSize / 1024 / 1024).toFixed(2)} MB`
    );

    // Get minimal build size
    const minimalBuildSize = await getDirectorySize(
      path.join(projectRoot, "dist-minimal")
    );
    console.log(
      `🎯 Minimal build: ${(minimalBuildSize / 1024 / 1024).toFixed(2)} MB`
    );

    const savings = fullBuildSize - minimalBuildSize;
    const savingsPercent = ((savings / fullBuildSize) * 100).toFixed(1);

    console.log(
      `💰 Space saved: ${(savings / 1024 / 1024).toFixed(2)} MB (${savingsPercent}%)`
    );
  } catch (error) {
    console.log("ℹ️  Could not compare sizes:", error.message);
  }
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dirPath, file.name);

      if (file.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }

  return totalSize;
}

// Run the minimal build
if (import.meta.url === `file://${process.argv[1]}`) {
  createMinimalBuild()
    .then(() => compareBuildSizes())
    .catch((error) => {
      console.error("❌ Minimal build failed:", error);
      process.exit(1);
    });
}
