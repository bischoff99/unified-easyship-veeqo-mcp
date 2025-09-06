#!/bin/bash

# Railway Deployment Script for Unified EasyPost-Veeqo MCP Server
# This script helps deploy the containerized MCP server to Railway

set -e

echo "🚀 Railway Deployment Script for Unified EasyPost-Veeqo MCP Server"
echo "=================================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if Docker is available (optional for local testing)
if command -v docker &> /dev/null; then
    echo "🐳 Docker found. Testing local build..."
    docker build -t unified-easyship-veeqo-mcp .
    echo "✅ Docker build successful!"
else
    echo "⚠️  Docker not available. Skipping local build test."
fi

# Check if user is logged into Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway:"
    railway login
fi

# Create or link to Railway project
echo "📦 Setting up Railway project..."
if [ -z "$RAILWAY_PROJECT_ID" ]; then
    echo "Creating new Railway project..."
    railway project create
else
    echo "Linking to existing project: $RAILWAY_PROJECT_ID"
    railway link $RAILWAY_PROJECT_ID
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
echo "Please set the following environment variables in Railway dashboard:"
echo "  - EASYPOST_API_KEY: Your EasyPost API key"
echo "  - VEEQO_API_KEY: Your Veeqo API key"
echo "  - NODE_ENV: production"
echo "  - LOG_LEVEL: info"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your MCP server should be available at the Railway URL"
echo "📊 Monitor your deployment at: https://railway.app/dashboard"