#!/bin/bash

# Cursor IDE Environment Setup Script
# This script sets up the optimal development environment for Cursor IDE

set -e

echo "🚀 Setting up Cursor IDE Environment for Unified EasyPost-Veeqo MCP"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_info "Setting up Cursor IDE environment..."

# 1. Install dependencies
print_info "Installing dependencies..."
if command -v pnpm &> /dev/null; then
    pnpm install
    print_status "Dependencies installed with pnpm"
else
    npm install
    print_status "Dependencies installed with npm"
fi

# 2. Build the project
print_info "Building project..."
pnpm run build
print_status "Project built successfully"

# 3. Run quality checks
print_info "Running quality checks..."
pnpm run quality:check
print_status "Quality checks passed"

# 4. Run tests
print_info "Running tests..."
pnpm test
print_status "All tests passed"

# 5. Validate project structure
print_info "Validating project structure..."
if [ -f "scripts/validate-structure.js" ]; then
    node scripts/validate-structure.js
    print_status "Project structure validated"
else
    print_warning "Structure validation script not found, skipping..."
fi

# 6. Setup environment variables
print_info "Setting up environment variables..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env file from .env.example"
        print_warning "Please update .env with your actual API keys"
    else
        print_warning "No .env.example found. Please create .env manually"
    fi
else
    print_status ".env file already exists"
fi

# 7. Setup Git hooks
print_info "Setting up Git hooks..."
if [ -d ".husky" ]; then
    if [ -f ".husky/pre-commit" ]; then
        chmod +x .husky/pre-commit
    fi
    if [ -f ".husky/pre-push" ]; then
        chmod +x .husky/pre-push
    fi
    print_status "Git hooks configured"
else
    print_warning "Husky not found. Git hooks not configured"
fi

# 8. Create Cursor workspace
print_info "Creating Cursor workspace..."
if [ -f "unified-easyship-veeqo-mcp.code-workspace" ]; then
    print_status "Cursor workspace file exists"
else
    print_warning "Cursor workspace file not found"
fi

# 9. Setup MCP server configuration
print_info "Setting up MCP server configuration..."
if [ -f ".cursor/mcp.json" ]; then
    print_status "MCP configuration exists"
else
    print_warning "MCP configuration not found"
fi

# 10. Verify Cursor IDE extensions
print_info "Checking recommended extensions..."
echo "Recommended Cursor IDE extensions:"
echo "- TypeScript and JavaScript Language Features"
echo "- ESLint"
echo "- Prettier"
echo "- GitLens"
echo "- Error Lens"
echo "- Path Intellisense"
echo "- Better Comments"
echo "- TODO Highlight"
echo "- REST Client"
echo "- Docker"
echo "- Vitest"

# 11. Display next steps
echo ""
echo "🎉 Cursor IDE Environment Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open the project in Cursor IDE"
echo "2. Install recommended extensions"
echo "3. Update .env with your API keys:"
echo "   - EASYPOST_API_KEY=your_easypost_key"
echo "   - VEEQO_API_KEY=your_veeqo_key"
echo "4. Start development server: pnpm run dev"
echo "5. Test MCP server: pnpm run dev:fastmcp"
echo ""
echo "Available commands:"
echo "- pnpm run dev          # Start development server"
echo "- pnpm run dev:fastmcp  # Start with mock API keys"
echo "- pnpm test             # Run tests"
echo "- pnpm run build        # Build project"
echo "- pnpm run quality:check # Run quality checks"
echo ""
echo "Cursor IDE features enabled:"
echo "- Auto-formatting on save"
echo "- ESLint integration"
echo "- TypeScript support"
echo "- Git integration"
echo "- MCP server integration"
echo "- Debug configurations"
echo "- Task automation"
echo ""
print_status "Environment setup complete! Happy coding! 🚀"