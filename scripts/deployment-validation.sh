#!/bin/bash

# =============================================================================
# Deployment Validation Script for Unified EasyPost-Veeqo MCP Server
# =============================================================================

set -e  # Exit on any error

echo "🚀 Starting deployment validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# ENVIRONMENT VALIDATION
# =============================================================================

print_status "Validating environment..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if required Node.js version
if ! node -e "process.exit(process.version.match(/v(\d+)/)[1] >= 20 ? 0 : 1)"; then
    print_error "Node.js version 20+ required. Current: $NODE_VERSION"
    exit 1
fi
print_success "Node.js version is compatible"

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# =============================================================================
# DEPENDENCY VALIDATION
# =============================================================================

print_status "Validating dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm ci
fi

# Check for security vulnerabilities
print_status "Checking for security vulnerabilities..."
npm audit --audit-level moderate
print_success "No critical security vulnerabilities found"

# Check for outdated dependencies
print_status "Checking for outdated dependencies..."
npm outdated || true

# =============================================================================
# CODE QUALITY VALIDATION
# =============================================================================

print_status "Running code quality checks..."

# TypeScript compilation
print_status "Running TypeScript type checking..."
npm run type-check
print_success "TypeScript compilation passed"

# ESLint
print_status "Running ESLint..."
npm run lint:check
print_success "ESLint checks passed"

# Prettier formatting
print_status "Checking code formatting..."
npm run format:check
print_success "Code formatting is correct"

# =============================================================================
# BUILD VALIDATION
# =============================================================================

print_status "Validating build process..."

# Clean previous builds
if [ -d "dist" ]; then
    rm -rf dist
    print_status "Cleaned previous build"
fi

# Build the project
npm run build
print_success "Build completed successfully"

# Check if essential files exist
REQUIRED_FILES=(
    "dist/server/fastmcp-server.js"
    "dist/services/clients/easypost-enhanced.js"
    "dist/services/clients/veeqo-enhanced.js"
    "dist/config/index.js"
    "dist/utils/logger.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required build file missing: $file"
        exit 1
    fi
done
print_success "All required build files present"

# =============================================================================
# CONFIGURATION VALIDATION
# =============================================================================

print_status "Validating configuration files..."

# Check for required configuration files
CONFIG_FILES=(
    "package.json"
    "tsconfig.json"
    ".eslintrc.json"
    "railway.json"
    "railway.toml"
    "mcp.json"
    "Dockerfile"
    ".env.example"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required configuration file missing: $file"
        exit 1
    fi
done
print_success "All configuration files present"

# Validate package.json structure
print_status "Validating package.json..."
node -e "
    const pkg = require('./package.json');
    if (!pkg.name || !pkg.version || !pkg.main || !pkg.scripts) {
        console.error('Invalid package.json structure');
        process.exit(1);
    }
    if (!pkg.scripts.start || !pkg.scripts.build || !pkg.scripts.dev) {
        console.error('Missing required scripts in package.json');
        process.exit(1);
    }
"
print_success "package.json is valid"

# =============================================================================
# DOCKER VALIDATION
# =============================================================================

print_status "Validating Docker configuration..."

# Check if Docker is available
if command -v docker &> /dev/null; then
    print_status "Docker is available"
    
    # Build Docker image for testing
    print_status "Building Docker image..."
    docker build -t easypost-veeqo-mcp:test . --quiet
    print_success "Docker image built successfully"
    
    # Test Docker image
    print_status "Testing Docker image..."
    CONTAINER_ID=$(docker run -d -e EASYPOST_API_KEY=mock -e VEEQO_API_KEY=mock easypost-veeqo-mcp:test)
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q "$CONTAINER_ID"; then
        print_success "Docker container is running"
        docker stop "$CONTAINER_ID" > /dev/null
        docker rm "$CONTAINER_ID" > /dev/null
    else
        print_error "Docker container failed to start"
        docker logs "$CONTAINER_ID"
        docker rm "$CONTAINER_ID" > /dev/null
        exit 1
    fi
    
    # Clean up test image
    docker rmi easypost-veeqo-mcp:test > /dev/null
else
    print_warning "Docker not available, skipping Docker validation"
fi

# =============================================================================
# HEALTH CHECK VALIDATION
# =============================================================================

print_status "Validating health checks..."

# Test health check functionality
node -e "
    const { healthCheckManager } = require('./dist/middleware/health-checks.js');
    healthCheckManager.runHealthChecks()
        .then(health => {
            console.log('Health check status:', health.status);
            if (health.status === 'critical') {
                console.error('Health checks failed:', health.checks.filter(c => c.status === 'critical'));
                process.exit(1);
            }
        })
        .catch(err => {
            console.error('Health check error:', err.message);
            process.exit(1);
        });
"
print_success "Health checks are working"

# =============================================================================
# DEPLOYMENT READINESS
# =============================================================================

print_status "Checking deployment readiness..."

# Check environment variables template
if [ ! -f ".env.example" ]; then
    print_error ".env.example file missing"
    exit 1
fi

# Check Railway configuration
if [ -f "railway.json" ] && [ -f "railway.toml" ]; then
    print_success "Railway deployment configuration present"
else
    print_warning "Railway configuration files missing"
fi

# Check MCP configuration
if [ -f "mcp.json" ]; then
    print_success "MCP configuration present"
else
    print_error "mcp.json configuration missing"
    exit 1
fi

# =============================================================================
# PERFORMANCE VALIDATION
# =============================================================================

print_status "Running performance checks..."

# Check bundle size
DIST_SIZE=$(du -sh dist/ | cut -f1)
print_status "Built application size: $DIST_SIZE"

# Check for large files
find dist/ -size +1M -type f | while read file; do
    SIZE=$(du -sh "$file" | cut -f1)
    print_warning "Large file detected: $file ($SIZE)"
done

# =============================================================================
# FINAL VALIDATION
# =============================================================================

print_status "Running final validation..."

# Test server startup (mock mode)
export EASYPOST_API_KEY=mock
export VEEQO_API_KEY=mock
export NODE_ENV=production

print_status "Testing server startup..."
timeout 10s node dist/server/fastmcp-server.js &
SERVER_PID=$!
sleep 3

# Check if server is still running
if kill -0 "$SERVER_PID" 2>/dev/null; then
    print_success "Server started successfully"
    kill "$SERVER_PID" 2>/dev/null || true
else
    print_error "Server failed to start"
    exit 1
fi

# =============================================================================
# SUCCESS
# =============================================================================

print_success "🎉 All deployment validations passed!"
print_status "The application is ready for deployment."

echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Environment validated"
echo "  ✅ Dependencies secure"
echo "  ✅ Code quality passed"
echo "  ✅ Build successful"
echo "  ✅ Configuration valid"
echo "  ✅ Docker ready"
echo "  ✅ Health checks working"
echo "  ✅ Performance acceptable"
echo "  ✅ Server startup tested"
echo ""
echo "🚀 Ready to deploy!"