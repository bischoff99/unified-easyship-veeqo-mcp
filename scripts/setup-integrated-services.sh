#!/bin/bash

# Integrated Services Setup Script
# This script sets up all your premium services: Hugging Face Pro, Claude Max, Warp Terminal Pro, and Railway Hobby

set -e

echo "🚀 Setting up integrated premium services for Unified EasyPost-Veeqo MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install Railway CLI
echo "🚂 Installing Railway CLI..."
npm install -g @railway/cli

# Install Hugging Face Hub
echo "🤗 Installing Hugging Face Hub..."
npm install -g huggingface-hub

# Install vibe-tools globally
echo "📦 Installing vibe-tools globally..."
npm install -g vibe-tools

# Install Playwright for browser automation
echo "🎭 Installing Playwright for browser automation..."
npm install -g playwright

# Install MCP filesystem server
echo "🔧 Installing MCP filesystem server..."
npm install -g @modelcontextprotocol/server-filesystem

# Create comprehensive environment file
echo "📝 Creating comprehensive environment file..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# ===========================================
# PREMIUM SERVICES CONFIGURATION
# ===========================================

# Hugging Face Pro (Email-based subscription)
HF_TOKEN="your-huggingface-token-here"
HF_HOME="$HOME/.cache/huggingface"
HF_HUB_CACHE="$HF_HOME/hub"

# Claude Max (Email-based subscription - no API key needed)
# Configure in Cursor Settings > Models > Anthropic

# Warp Terminal Pro (Email-based subscription)
# Configure in Warp Settings

# Railway Hobby ($5/month)
RAILWAY_TOKEN="your-railway-token-here"

# ===========================================
# AI TOOLS CONFIGURATION
# ===========================================

# Required for vibe-tools
PERPLEXITY_API_KEY="your-perplexity-api-key"
GEMINI_API_KEY="your-gemini-api-key"

# Optional AI providers
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"
GITHUB_TOKEN="your-github-token"

# ===========================================
# PROJECT-SPECIFIC VARIABLES
# ===========================================

# EasyPost Configuration
EASYPOST_API_KEY="mock"
EASYPOST_BASE_URL="https://api.easypost.com/v2"

# Veeqo Configuration  
VEEQO_API_KEY="your-veeqo-api-key"
VEEQO_BASE_URL="https://api.veeqo.com"
VEEQO_ENDPOINT_RATES="/rate_shopping/rates"
VEEQO_ENDPOINT_PURCHASE="/rate_shopping/labels"

# Logging Configuration
LOG_LEVEL="info"
NODE_ENV="development"

# ===========================================
# DEPLOYMENT CONFIGURATION
# ===========================================

# Railway deployment settings
RAILWAY_PROJECT_ID=""
RAILWAY_SERVICE_ID=""
RAILWAY_ENVIRONMENT="production"

# Hugging Face Spaces (for model deployment)
HF_SPACE_ID=""
HF_SPACE_HARDWARE="cpu-basic"

# ===========================================
# DEVELOPMENT TOOLS
# ===========================================

# Warp Terminal integration
WARP_WORKFLOWS_DIR="$HOME/.warp/workflows"
WARP_THEMES_DIR="$HOME/.warp/themes"

# Cursor AI integration
CURSOR_AI_MODEL="claude-3-5-sonnet"
CURSOR_AI_PROVIDER="anthropic"
EOF
    echo "✅ Created comprehensive .env file"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

# Create Railway configuration
echo "🚂 Creating Railway configuration..."
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Create Hugging Face configuration
echo "🤗 Creating Hugging Face configuration..."
mkdir -p .huggingface
cat > .huggingface/config.json << 'EOF'
{
  "cache_dir": "~/.cache/huggingface",
  "default_repo_type": "model",
  "default_repo_id": "unified-easyship-veeqo-mcp",
  "endpoint": "https://huggingface.co",
  "local_files_only": false,
  "use_auth_token": true
}
EOF

# Create Warp Terminal workflows
echo "⚡ Creating Warp Terminal workflows..."
mkdir -p ~/.warp/workflows
cat > ~/.warp/workflows/mcp-server.yaml << 'EOF'
name: "MCP Server Management"
description: "Workflows for managing the Unified EasyPost-Veeqo MCP Server"
version: "1.0.0"

workflows:
  - name: "Start MCP Server"
    description: "Start the MCP server in development mode"
    command: "npm run dev"
    directory: "/home/bischoff666/unified-easyship-veeqo-mcp"
    
  - name: "Deploy to Railway"
    description: "Deploy the MCP server to Railway"
    command: "railway up"
    directory: "/home/bischoff666/unified-easyship-veeqo-mcp"
    
  - name: "Test MCP Server"
    description: "Run tests for the MCP server"
    command: "npm test"
    directory: "/home/bischoff666/unified-easyship-veeqo-mcp"
    
  - name: "Build MCP Server"
    description: "Build the MCP server for production"
    command: "npm run build"
    directory: "/home/bischoff666/unified-easyship-veeqo-mcp"
EOF

# Create enhanced vibe-tools configuration
echo "🔧 Creating enhanced vibe-tools configuration..."
cat > vibe-tools.config.json << 'EOF'
{
  "repo": {
    "provider": "gemini",
    "model": "gemini-2.5-pro-exp",
    "maxTokens": 10000
  },
  "doc": {
    "provider": "gemini",
    "model": "gemini-2.5-pro-exp",
    "maxTokens": 10000
  },
  "plan": {
    "fileProvider": "gemini",
    "thinkingProvider": "openai",
    "fileModel": "gemini-2.5-pro-exp",
    "thinkingModel": "gpt-4o",
    "fileMaxTokens": 8192,
    "thinkingMaxTokens": 8192
  },
  "web": {
    "provider": "perplexity",
    "model": "sonar-pro",
    "maxTokens": 8000
  },
  "browser": {
    "headless": true,
    "timeout": 30000,
    "stagehand": {
      "provider": "anthropic",
      "model": "claude-3-7-sonnet-latest",
      "timeout": 30000,
      "headless": true
    }
  },
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-filesystem",
          "/home/bischoff666/unified-easyship-veeqo-mcp"
        ]
      },
      "huggingface": {
        "command": "npx",
        "args": [
          "-y",
          "@huggingface/hub",
          "--token",
          "${HF_TOKEN}"
        ]
      }
    }
  },
  "huggingface": {
    "token": "${HF_TOKEN}",
    "cache_dir": "${HF_HOME}",
    "default_repo_type": "model"
  },
  "railway": {
    "token": "${RAILWAY_TOKEN}",
    "project_id": "${RAILWAY_PROJECT_ID}",
    "service_id": "${RAILWAY_SERVICE_ID}"
  },
  "perplexity": {
    "model": "sonar-pro",
    "maxTokens": 8000
  },
  "gemini": {
    "model": "gemini-2.5-pro-exp",
    "maxTokens": 10000
  },
  "openai": {
    "model": "gpt-4o",
    "maxTokens": 8000
  },
  "anthropic": {
    "model": "claude-3-7-sonnet-latest",
    "maxTokens": 8000
  }
}
EOF

# Create deployment scripts
echo "📦 Creating deployment scripts..."
mkdir -p scripts/deployment

# Railway deployment script
cat > scripts/deployment/deploy-railway.sh << 'EOF'
#!/bin/bash
set -e

echo "🚂 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

# Initialize project if not already linked
if [ ! -f .railway/project.json ]; then
    echo "🔗 Initializing Railway project..."
    railway init
fi

# Deploy the application
echo "🚀 Deploying application..."
railway up

# Get the deployment URL
echo "🌐 Getting deployment URL..."
railway domain

echo "✅ Deployment complete!"
EOF

# Hugging Face deployment script
cat > scripts/deployment/deploy-huggingface.sh << 'EOF'
#!/bin/bash
set -e

echo "🤗 Deploying to Hugging Face..."

# Check if HF token is set
if [ -z "$HF_TOKEN" ]; then
    echo "❌ HF_TOKEN not set. Please set it in your .env file."
    exit 1
fi

# Login to Hugging Face
echo "🔐 Logging into Hugging Face..."
huggingface-cli login --token $HF_TOKEN

# Create a Space for the MCP server
echo "🚀 Creating Hugging Face Space..."
huggingface-cli repo create unified-easyship-veeqo-mcp --type space --private

# Upload the application
echo "📤 Uploading application files..."
huggingface-cli upload unified-easyship-veeqo-mcp . --repo-type space

echo "✅ Deployment to Hugging Face complete!"
echo "🌐 Your Space: https://huggingface.co/spaces/$(whoami)/unified-easyship-veeqo-mcp"
EOF

# Make scripts executable
chmod +x scripts/deployment/*.sh

# Initialize vibe-tools in the project
echo "🔧 Initializing vibe-tools in project..."
vibe-tools install .

# Create comprehensive README
echo "📚 Creating comprehensive setup guide..."
cat > INTEGRATED_SERVICES_SETUP.md << 'EOF'
# Integrated Premium Services Setup Guide

This guide helps you set up and use all your premium services with the Unified EasyPost-Veeqo MCP Server.

## 🎯 Your Premium Services

### 1. **Hugging Face Pro** (Email-based subscription)
- **Access**: Unlimited model downloads and inference
- **Features**: Private repositories, advanced model hosting
- **Setup**: Configure `HF_TOKEN` in `.env` file

### 2. **Claude Max** (Email-based subscription)
- **Access**: Unlimited Claude usage in Cursor
- **Features**: Advanced reasoning, long context windows
- **Setup**: Configure in Cursor Settings > Models > Anthropic

### 3. **Warp Terminal Pro** (Email-based subscription)
- **Access**: Advanced terminal features, workflows, themes
- **Features**: AI-powered terminal, custom workflows
- **Setup**: Configure in Warp Settings

### 4. **Railway Hobby** ($5/month)
- **Access**: Deploy applications with custom domains
- **Features**: Automatic deployments, database hosting
- **Setup**: Configure `RAILWAY_TOKEN` in `.env` file

## 🚀 Quick Start

### 1. Configure Environment Variables
Edit your `.env` file with your actual tokens:

```bash
# Get your Hugging Face token
# Visit: https://huggingface.co/settings/tokens
HF_TOKEN="hf_your_token_here"

# Get your Railway token
# Visit: https://railway.app/account/tokens
RAILWAY_TOKEN="your_railway_token_here"

# Get your API keys for AI tools
PERPLEXITY_API_KEY="your_perplexity_key"
GEMINI_API_KEY="your_gemini_key"
```

### 2. Deploy to Railway
```bash
./scripts/deployment/deploy-railway.sh
```

### 3. Deploy to Hugging Face
```bash
./scripts/deployment/deploy-huggingface.sh
```

### 4. Use AI-Powered Development
```bash
# Analyze your codebase
vibe-tools repo "explain the MCP server architecture"

# Generate implementation plans
vibe-tools plan "add rate limiting to the API"

# Deploy with AI assistance
vibe-tools browser act "Deploy to Railway" --url "https://railway.app"
```

## 🔧 Service-Specific Features

### Hugging Face Pro Integration
- **Model Hosting**: Deploy your MCP server as a Hugging Face Space
- **Model Access**: Use any model from the Hugging Face Hub
- **Private Repos**: Keep your models and data private

```bash
# List available models
huggingface-cli repo list

# Download a model
huggingface-cli download microsoft/DialoGPT-medium

# Create a new model repository
huggingface-cli repo create my-mcp-model --type model
```

### Claude Max in Cursor
- **Advanced Code Generation**: Use Claude for complex MCP server development
- **Long Context**: Process entire codebases in one conversation
- **Multi-file Editing**: Edit multiple files simultaneously

### Warp Terminal Pro
- **AI Commands**: Use natural language to generate terminal commands
- **Workflows**: Automate common development tasks
- **Custom Themes**: Personalize your terminal experience

```bash
# Use AI to generate commands
# Type: "deploy my MCP server to Railway"
# Warp will suggest: railway up

# Use workflows
# Press Cmd+Shift+P and select "MCP Server Management"
```

### Railway Hobby
- **Automatic Deployments**: Deploy on every git push
- **Custom Domains**: Use your own domain for your MCP server
- **Database Hosting**: Add PostgreSQL, Redis, or MongoDB

```bash
# Add a database
railway add postgres

# Set environment variables
railway variables set EASYPOST_API_KEY=your_key

# Deploy
railway up
```

## 🎨 Advanced Workflows

### 1. AI-Powered Development Cycle
```bash
# 1. Analyze current state
vibe-tools repo "what needs to be improved in the MCP server?"

# 2. Generate implementation plan
vibe-tools plan "implement the suggested improvements"

# 3. Deploy changes
railway up

# 4. Test deployment
vibe-tools browser act "test the deployed MCP server" --url "https://your-app.railway.app"
```

### 2. Model Integration Workflow
```bash
# 1. Find relevant models on Hugging Face
huggingface-cli search "shipping logistics"

# 2. Download and integrate model
huggingface-cli download model-name

# 3. Deploy updated server
railway up
```

### 3. Multi-Platform Deployment
```bash
# Deploy to Railway (production)
./scripts/deployment/deploy-railway.sh

# Deploy to Hugging Face (demo)
./scripts/deployment/deploy-huggingface.sh

# Test both deployments
vibe-tools browser act "test both deployments" --url "https://your-app.railway.app"
```

## 🔍 Monitoring and Debugging

### Railway Monitoring
```bash
# View logs
railway logs

# Check service status
railway status

# SSH into deployment
railway ssh
```

### Hugging Face Monitoring
```bash
# Check Space status
huggingface-cli repo info unified-easyship-veeqo-mcp --repo-type space

# View Space logs
# Visit: https://huggingface.co/spaces/your-username/unified-easyship-veeqo-mcp
```

## 🎉 You're All Set!

Your premium services are now integrated and ready to use. Try these commands to get started:

```bash
# Start developing with AI assistance
vibe-tools repo "explain the project structure"

# Deploy your changes
railway up

# Test your deployment
vibe-tools browser act "test the MCP server endpoints" --url "https://your-app.railway.app"
```

## 📚 Resources

- [Hugging Face Hub Documentation](https://huggingface.co/docs/hub)
- [Railway Documentation](https://docs.railway.app)
- [Warp Terminal Documentation](https://docs.warp.dev)
- [Cursor Documentation](https://docs.cursor.com)
- [vibe-tools GitHub](https://github.com/eastlondoner/cursor-tools)

Happy coding with your premium setup! 🚀
EOF

echo ""
echo "🎉 Integrated premium services setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your actual API keys and tokens"
echo "2. Login to Railway: railway login"
echo "3. Login to Hugging Face: huggingface-cli login"
echo "4. Configure Claude Max in Cursor Settings > Models > Anthropic"
echo "5. Configure Warp Terminal Pro in Warp Settings"
echo ""
echo "🚀 Try these commands:"
echo "   - vibe-tools repo 'explain the project architecture'"
echo "   - railway up (to deploy)"
echo "   - huggingface-cli repo list (to see your models)"
echo ""
echo "📚 Read INTEGRATED_SERVICES_SETUP.md for detailed instructions"
echo ""
echo "🔗 Useful resources:"
echo "   - Railway Dashboard: https://railway.app/dashboard"
echo "   - Hugging Face Hub: https://huggingface.co"
echo "   - Cursor Settings: Ctrl/⌘ + Shift + J"
echo "   - Warp Settings: Cmd + ,"
echo ""
