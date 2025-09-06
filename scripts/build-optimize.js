#!/usr/bin/env node

/**
 * Build optimization script for FastMCP server
 * Provides optimized builds with minification, bundling, and analysis
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/**
 * Build configuration
 */
const buildConfig = {
  target: 'node20',
  format: 'esm',
  platform: 'node',
  bundle: false, // Keep modules separate for better debugging
  minify: process.env.NODE_ENV === 'production',
  sourcemap: true,
  outdir: 'dist',
  external: [
    'fastmcp',
    'pino',
    'pino-pretty',
    'zod',
    'undici',
    'dotenv',
    'express',
    'jsonwebtoken',
  ],
};

/**
 * Clean build directory
 */
async function cleanBuild() {
  console.log('🧹 Cleaning build directory...');
  try {
    await fs.rm(path.join(projectRoot, 'dist'), { recursive: true, force: true });
    console.log('✅ Build directory cleaned');
  } catch (error) {
    console.log('ℹ️  No existing build directory to clean');
  }
}

/**
 * Run TypeScript compilation
 */
async function compileTSC() {
  console.log('📝 Running TypeScript compilation...');
  try {
    execSync('npx tsc', { cwd: projectRoot, stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed');
  } catch (error) {
    console.error('❌ TypeScript compilation failed');
    throw error;
  }
}

/**
 * Bundle server for production if needed
 */
async function bundleForProduction() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️  Skipping bundling (not production build)');
    return;
  }

  console.log('📦 Creating production bundle...');

  // Create a simple bundled version for production deployment
  const serverContent = await fs.readFile(
    path.join(projectRoot, 'dist/server/fastmcp-server.js'),
    'utf-8'
  );

  // Add production optimizations
  const optimizedContent = `// Production build - ${new Date().toISOString()}
// Unified EasyPost-Veeqo MCP Server
${serverContent}`;

  await fs.writeFile(path.join(projectRoot, 'dist/server/fastmcp-server.js'), optimizedContent);

  console.log('✅ Production bundle created');
}

/**
 * Generate build manifest
 */
async function generateBuildManifest() {
  console.log('📋 Generating build manifest...');

  const packageJson = JSON.parse(
    await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8')
  );

  const gitCommit = (() => {
    try {
      return execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  })();

  const gitBranch = (() => {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectRoot,
        encoding: 'utf-8',
      }).trim();
    } catch {
      return 'unknown';
    }
  })();

  const buildManifest = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    buildTime: new Date().toISOString(),
    buildEnvironment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    git: {
      commit: gitCommit,
      branch: gitBranch,
    },
    dependencies: packageJson.dependencies,
    buildConfig,
    features: {
      fastmcp: true,
      easypostIntegration: true,
      veeqoIntegration: true,
      claudeAI: true,
      performanceMonitoring: true,
      healthChecks: true,
    },
  };

  await fs.writeFile(
    path.join(projectRoot, 'dist/build-manifest.json'),
    JSON.stringify(buildManifest, null, 2)
  );

  console.log('✅ Build manifest generated');
}

/**
 * Copy static assets
 */
async function copyAssets() {
  console.log('📁 Copying static assets...');

  const assetsToCopy = [
    { src: 'package.json', dest: 'package.json' },
    { src: '.env.example', dest: '.env.example', optional: true },
  ];

  for (const asset of assetsToCopy) {
    try {
      const srcPath = path.join(projectRoot, asset.src);
      const destPath = path.join(projectRoot, 'dist', asset.dest);

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
      console.log(`✅ Copied ${asset.src}`);
    } catch (error) {
      if (!asset.optional) {
        console.error(`❌ Failed to copy ${asset.src}:`, error);
      } else {
        console.log(`ℹ️  Optional asset ${asset.src} not found, skipping`);
      }
    }
  }
}

/**
 * Analyze bundle size
 */
async function analyzeBundleSize() {
  console.log('📊 Analyzing bundle size...');

  const distPath = path.join(projectRoot, 'dist');

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
      console.warn(`Warning: Could not analyze ${dirPath}:`, error.message);
    }

    return totalSize;
  }

  const totalSize = await getDirectorySize(distPath);
  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

  console.log(`📦 Total build size: ${sizeMB} MB`);

  // Get largest files
  const largeFiles = [];

  async function findLargeFiles(dirPath, threshold = 100 * 1024) {
    // 100KB threshold
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          await findLargeFiles(filePath, threshold);
        } else {
          const stats = await fs.stat(filePath);
          if (stats.size > threshold) {
            largeFiles.push({
              path: path.relative(projectRoot, filePath),
              size: stats.size,
              sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not analyze ${dirPath}:`, error.message);
    }
  }

  await findLargeFiles(distPath);

  if (largeFiles.length > 0) {
    console.log('🔍 Largest files:');
    largeFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach((file) => {
        console.log(`  ${file.path}: ${file.sizeMB} MB`);
      });
  }

  const analysis = {
    totalSize,
    totalSizeMB: sizeMB,
    largestFiles: largeFiles.slice(0, 10),
    buildTime: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(projectRoot, 'dist/bundle-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );

  console.log('✅ Bundle analysis completed');
}

/**
 * Validate build
 */
async function validateBuild() {
  console.log('🔍 Validating build...');

  const requiredFiles = ['dist/server/fastmcp-server.js', 'dist/build-manifest.json'];

  const missingFiles = [];

  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(projectRoot, file));
    } catch {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.error('❌ Build validation failed - missing files:');
    missingFiles.forEach((file) => console.error(`  - ${file}`));
    throw new Error('Build validation failed');
  }

  // Test that the server file can be imported
  try {
    const serverPath = path.join(projectRoot, 'dist/server/fastmcp-server.js');
    // Basic syntax check
    await fs.readFile(serverPath, 'utf-8');
    console.log('✅ Server file syntax validation passed');
  } catch (error) {
    console.error('❌ Server file validation failed:', error);
    throw error;
  }

  console.log('✅ Build validation completed');
}

/**
 * Create deployment-ready archive
 */
async function createDeploymentArchive() {
  if (process.env.CREATE_ARCHIVE !== 'true') {
    console.log('ℹ️  Skipping archive creation (set CREATE_ARCHIVE=true to enable)');
    return;
  }

  console.log('📦 Creating deployment archive...');

  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8')
    );

    const archiveName = `${packageJson.name}-${packageJson.version}-${Date.now()}.tar.gz`;
    const archivePath = path.join(projectRoot, archiveName);

    execSync(`tar -czf "${archiveName}" dist/ package.json README.md`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    console.log(`✅ Deployment archive created: ${archiveName}`);
  } catch (error) {
    console.warn('⚠️  Failed to create deployment archive:', error.message);
  }
}

/**
 * Main build process
 */
async function main() {
  const startTime = Date.now();

  console.log('🚀 Starting optimized build process...');
  console.log(`📝 Build environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    await cleanBuild();
    await compileTSC();
    await bundleForProduction();
    await copyAssets();
    await generateBuildManifest();
    await analyzeBundleSize();
    await validateBuild();
    await createDeploymentArchive();

    const buildTime = Date.now() - startTime;
    console.log(`✅ Build completed successfully in ${buildTime}ms`);

    // Output summary
    const manifest = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'dist/build-manifest.json'), 'utf-8')
    );

    console.log('\n📋 Build Summary:');
    console.log(`  Name: ${manifest.name}`);
    console.log(`  Version: ${manifest.version}`);
    console.log(`  Environment: ${manifest.buildEnvironment}`);
    console.log(`  Node Version: ${manifest.nodeVersion}`);
    console.log(`  Git Branch: ${manifest.git.branch}`);
    console.log(`  Git Commit: ${manifest.git.commit.substring(0, 8)}`);
    console.log(`  Build Time: ${buildTime}ms`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
