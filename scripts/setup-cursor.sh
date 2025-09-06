#!/bin/bash

# Enhanced Cursor Environment Setup Script
# This script sets up a comprehensive Cursor development environment
# with optimized settings, extensions, and productivity tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print step headers
print_step() {
    echo ""
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "$BLUE" "► $1"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Welcome message
clear
echo ""
print_color "$CYAN" "╔════════════════════════════════════════════════════════╗"
print_color "$CYAN" "║                                                        ║"
print_color "$CYAN" "║    🚀 Enhanced Cursor Environment Setup Script 🚀      ║"
print_color "$CYAN" "║                                                        ║"
print_color "$CYAN" "║    Unified EasyPost-Veeqo MCP Server                  ║"
print_color "$CYAN" "║                                                        ║"
print_color "$CYAN" "╚════════════════════════════════════════════════════════╝"
echo ""

# Check system requirements
print_step "Checking System Requirements"

# Check OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     OS_TYPE=Linux;;
    Darwin*)    OS_TYPE=Mac;;
    CYGWIN*)    OS_TYPE=Windows;;
    MINGW*)     OS_TYPE=Windows;;
    *)          OS_TYPE="UNKNOWN:${OS}"
esac
print_color "$GREEN" "✓ Operating System: ${OS_TYPE}"

# Check if Node.js is installed and version
if ! command -v node &> /dev/null; then
    print_color "$RED" "✗ Node.js is not installed. Please install Node.js 20.0.0+ first."
    exit 1
else
    NODE_VERSION=$(node -v)
    print_color "$GREEN" "✓ Node.js ${NODE_VERSION} is installed"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_color "$RED" "✗ npm is not installed. Please install npm first."
    exit 1
else
    NPM_VERSION=$(npm -v)
    print_color "$GREEN" "✓ npm ${NPM_VERSION} is installed"
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    print_color "$YELLOW" "⚠ Git is not installed. Some features may not work properly."
else
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_color "$GREEN" "✓ Git ${GIT_VERSION} is installed"
fi

# Setup Cursor configuration directory
print_step "Setting Up Cursor Configuration"

# Create .cursor directory if it doesn't exist
if [ ! -d ".cursor" ]; then
    mkdir -p .cursor
    print_color "$GREEN" "✓ Created .cursor directory"
else
    print_color "$YELLOW" "⚠ .cursor directory already exists"
fi

# Copy settings if not already present
if [ ! -f ".cursor/settings.json" ]; then
    print_color "$YELLOW" "⚠ .cursor/settings.json not found. Run this script from the project root."
else
    print_color "$GREEN" "✓ Cursor settings.json is configured"
fi

# Copy extensions if not already present
if [ ! -f ".cursor/extensions.json" ]; then
    print_color "$YELLOW" "⚠ .cursor/extensions.json not found. Run this script from the project root."
else
    print_color "$GREEN" "✓ Cursor extensions.json is configured"
fi

# Install global npm packages
print_step "Installing Global Development Tools"

# Array of global packages to install
GLOBAL_PACKAGES=(
    "typescript"
    "tsx"
    "nodemon"
    "pm2"
    "npm-check-updates"
    "depcheck"
    "license-checker"
    "vibe-tools"
    "playwright"
    "@modelcontextprotocol/server-filesystem"
)

for package in "${GLOBAL_PACKAGES[@]}"; do
    if npm list -g --depth=0 2>/dev/null | grep -q "$package"; then
        print_color "$GREEN" "✓ $package is already installed globally"
    else
        print_color "$YELLOW" "📦 Installing $package globally..."
        npm install -g "$package" --silent
        print_color "$GREEN" "✓ $package installed successfully"
    fi
done

# Install project dependencies
print_step "Installing Project Dependencies"

if [ -f "package.json" ]; then
    print_color "$YELLOW" "📦 Installing project dependencies..."
    npm install --silent
    print_color "$GREEN" "✓ Dependencies installed successfully"
else
    print_color "$RED" "✗ package.json not found. Please run from project root."
    exit 1
fi

# Setup environment files
print_step "Setting Up Environment Configuration"

# Create .env from .env.example if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_color "$GREEN" "✓ Created .env from .env.example"
        print_color "$YELLOW" "⚠ Please update .env with your actual API keys"
    else
        # Create a comprehensive .env template
        cat > .env << 'EOF'
# ==========================================
# Unified EasyPost-Veeqo MCP Server
# Environment Configuration
# ==========================================

# ------------------------------------------
# Core API Keys (Required)
# ------------------------------------------
EASYPOST_API_KEY="mock"  # Use "mock" for development
VEEQO_API_KEY="your-veeqo-api-key"

# ------------------------------------------
# AI Services (Optional but Recommended)
# ------------------------------------------
# Claude Code SDK for shipping optimization
ANTHROPIC_API_KEY="your-anthropic-api-key"
CLAUDE_CODE_API_KEY="your-claude-code-api-key"

# Hugging Face for ML models
HUGGING_FACE_HUB_TOKEN="your-hugging-face-token"

# OpenAI for additional AI features
OPENAI_API_KEY="your-openai-api-key"

# ------------------------------------------
# Development Tools API Keys
# ------------------------------------------
# Perplexity for vibe-tools
PERPLEXITY_API_KEY="your-perplexity-api-key"

# Google Gemini for vibe-tools
GEMINI_API_KEY="your-gemini-api-key"

# GitHub for repository operations
GITHUB_TOKEN="your-github-token"

# OpenRouter for model routing
OPENROUTER_API_KEY="your-openrouter-api-key"

# ------------------------------------------
# Server Configuration
# ------------------------------------------
# Server port
PORT=3000

# Node environment (development, production, test)
NODE_ENV="development"

# Logging configuration
LOG_LEVEL="info"  # debug, info, warn, error
LOG_FORMAT="pretty"  # pretty, json

# ------------------------------------------
# Database Configuration (Future)
# ------------------------------------------
# DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
# REDIS_URL="redis://localhost:6379"

# ------------------------------------------
# Security Configuration
# ------------------------------------------
# JWT secret for authentication
JWT_SECRET="your-super-secret-jwt-key"

# Session secret
SESSION_SECRET="your-session-secret"

# API rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# ------------------------------------------
# External Service URLs
# ------------------------------------------
EASYPOST_BASE_URL="https://api.easypost.com/v2"
VEEQO_BASE_URL="https://api.veeqo.com"

# ------------------------------------------
# Feature Flags
# ------------------------------------------
ENABLE_AI_OPTIMIZATION="true"
ENABLE_MOCK_MODE="true"
ENABLE_HEALTH_CHECK="true"
ENABLE_METRICS="true"
ENABLE_CACHING="false"

# ------------------------------------------
# Monitoring & Analytics
# ------------------------------------------
# Sentry for error tracking
SENTRY_DSN=""

# DataDog for APM
DATADOG_API_KEY=""

# New Relic for performance monitoring
NEW_RELIC_LICENSE_KEY=""

# ------------------------------------------
# Cloud Deployment
# ------------------------------------------
# Railway
RAILWAY_STATIC_URL=""
RAILWAY_PUBLIC_DOMAIN=""

# AWS
AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# ------------------------------------------
# Development Settings
# ------------------------------------------
# Hot reload
WATCH_MODE="true"

# Debug mode
DEBUG="*"

# Source maps
GENERATE_SOURCEMAP="true"
EOF
        print_color "$GREEN" "✓ Created comprehensive .env template"
        print_color "$YELLOW" "⚠ Please update .env with your actual API keys"
    fi
else
    print_color "$GREEN" "✓ .env file already exists"
fi

# Create additional configuration files
print_step "Creating Additional Configuration Files"

# Create .prettierrc if it doesn't exist
if [ ! -f ".prettierrc" ]; then
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
    print_color "$GREEN" "✓ Created .prettierrc configuration"
else
    print_color "$GREEN" "✓ .prettierrc already exists"
fi

# Create .eslintignore if it doesn't exist
if [ ! -f ".eslintignore" ]; then
    cat > .eslintignore << 'EOF'
node_modules/
dist/
build/
coverage/
*.log
.env
.env.*
*.min.js
*.bundle.js
EOF
    print_color "$GREEN" "✓ Created .eslintignore"
else
    print_color "$GREEN" "✓ .eslintignore already exists"
fi

# Create .prettierignore if it doesn't exist
if [ ! -f ".prettierignore" ]; then
    cat > .prettierignore << 'EOF'
node_modules/
dist/
build/
coverage/
*.log
.env
.env.*
*.min.js
*.bundle.js
package-lock.json
pnpm-lock.yaml
yarn.lock
EOF
    print_color "$GREEN" "✓ Created .prettierignore"
else
    print_color "$GREEN" "✓ .prettierignore already exists"
fi

# Setup Git hooks
print_step "Setting Up Git Hooks"

# Create .husky directory and install husky if package.json exists
if [ -f "package.json" ] && ! [ -d ".husky" ]; then
    print_color "$YELLOW" "📦 Installing husky for Git hooks..."
    npm install --save-dev husky --silent
    npx husky install --silent
    
    # Create pre-commit hook
    npx husky add .husky/pre-commit "npm run lint" 2>/dev/null || true
    npx husky add .husky/pre-commit "npm run format" 2>/dev/null || true
    
    print_color "$GREEN" "✓ Git hooks configured with husky"
else
    print_color "$GREEN" "✓ Git hooks already configured or not needed"
fi

# Initialize vibe-tools
print_step "Initializing AI Development Tools"

if command -v vibe-tools &> /dev/null; then
    print_color "$YELLOW" "🤖 Initializing vibe-tools..."
    vibe-tools install . 2>/dev/null || true
    print_color "$GREEN" "✓ vibe-tools initialized"
else
    print_color "$YELLOW" "⚠ vibe-tools not found, skipping initialization"
fi

# Create VS Code workspace file
print_step "Creating Workspace Configuration"

if [ ! -f "unified-easypost-veeqo.code-workspace" ]; then
    cat > unified-easypost-veeqo.code-workspace << 'EOF'
{
  "folders": [
    {
      "path": ".",
      "name": "📦 Unified EasyPost-Veeqo MCP"
    }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    },
    "terminal.integrated.defaultProfile.linux": "bash",
    "terminal.integrated.defaultProfile.osx": "zsh",
    "terminal.integrated.defaultProfile.windows": "powershell"
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "eamodio.gitlens",
      "usernamehw.errorlens"
    ]
  },
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "type": "node",
        "request": "launch",
        "name": "🚀 Debug FastMCP Server",
        "program": "${workspaceFolder}/src/server/fastmcp-server.ts",
        "runtimeExecutable": "tsx",
        "skipFiles": ["<node_internals>/**"],
        "env": {
          "NODE_ENV": "development",
          "LOG_LEVEL": "debug"
        }
      },
      {
        "type": "node",
        "request": "launch",
        "name": "🧪 Run Tests",
        "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
        "args": ["run"],
        "skipFiles": ["<node_internals>/**"]
      }
    ]
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "📦 Install Dependencies",
        "type": "npm",
        "script": "install",
        "problemMatcher": []
      },
      {
        "label": "🏗️ Build Project",
        "type": "npm",
        "script": "build",
        "group": "build",
        "problemMatcher": ["$tsc"]
      },
      {
        "label": "🚀 Start Dev Server",
        "type": "npm",
        "script": "dev:fastmcp",
        "isBackground": true,
        "problemMatcher": []
      },
      {
        "label": "🧪 Run Tests",
        "type": "npm",
        "script": "test",
        "group": "test",
        "problemMatcher": []
      }
    ]
  }
}
EOF
    print_color "$GREEN" "✓ Created VS Code workspace file"
else
    print_color "$GREEN" "✓ Workspace file already exists"
fi

# Run initial build
print_step "Running Initial Build"

print_color "$YELLOW" "🏗️ Building TypeScript project..."
npm run build 2>/dev/null || {
    print_color "$YELLOW" "⚠ Build failed or not configured. This is normal for initial setup."
}

# Display summary
print_step "Setup Complete! 🎉"

echo ""
print_color "$GREEN" "✅ Environment setup completed successfully!"
echo ""
print_color "$CYAN" "📋 Configuration Summary:"
print_color "$WHITE" "   • Cursor settings configured in .cursor/settings.json"
print_color "$WHITE" "   • Extension recommendations in .cursor/extensions.json"
print_color "$WHITE" "   • Environment variables template in .env"
print_color "$WHITE" "   • Code formatting configured (.prettierrc)"
print_color "$WHITE" "   • Linting configured (.eslintignore)"
print_color "$WHITE" "   • Workspace file created"
echo ""
print_color "$CYAN" "🚀 Quick Start Commands:"
print_color "$WHITE" "   npm run dev:fastmcp     # Start development server"
print_color "$WHITE" "   npm test               # Run tests"
print_color "$WHITE" "   npm run lint           # Check code quality"
print_color "$WHITE" "   npm run build          # Build for production"
echo ""
print_color "$CYAN" "⌨️ Cursor Keyboard Shortcuts:"
print_color "$WHITE" "   Ctrl/⌘ + L            # Open AI Chat"
print_color "$WHITE" "   Ctrl/⌘ + K            # Quick AI Edit"
print_color "$WHITE" "   Ctrl/⌘ + Shift + P    # Command Palette"
print_color "$WHITE" "   Ctrl/⌘ + Shift + J    # Cursor Settings"
echo ""
print_color "$CYAN" "🤖 AI Commands (if configured):"
print_color "$WHITE" "   vibe-tools repo 'explain architecture'"
print_color "$WHITE" "   vibe-tools plan 'add new feature'"
print_color "$WHITE" "   vibe-tools doc"
echo ""
print_color "$YELLOW" "⚠️  Next Steps:"
print_color "$WHITE" "   1. Update .env file with your actual API keys"
print_color "$WHITE" "   2. Restart Cursor to apply all settings"
print_color "$WHITE" "   3. Install recommended extensions when prompted"
print_color "$WHITE" "   4. Run 'npm run validate' to verify MCP server setup"
echo ""
print_color "$CYAN" "📚 Documentation:"
print_color "$WHITE" "   • README.md           - Project documentation"
print_color "$WHITE" "   • CLAUDE.md           - Claude Code guidelines"
print_color "$WHITE" "   • .cursorrules        - Cursor AI rules"
echo ""
print_color "$GREEN" "Happy coding! 🚀"
echo ""