# CLAUDE.md

This file provides guidance to Claude Code (

# Claude Code SDK integration removed

## Project Overview

Unified MCP server integrating EasyPost shipping services with Veeqo inventory management for comprehensive shipping and inventory orchestration.

## Essential Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Key Files

- `src/server/fastmcp-server.ts` - Main MCP server implementation
- `src/services/clients/` - API client implementations
- `src/services/integrations/` - AI integrations removed
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Development Notes

- Uses TypeScript with strict type checking
- Implements FastMCP framework for MCP server
- Integrates EasyPost and Veeqo APIs
- Includes shipping optimization and analytics
- Follows structured logging with pino
- Uses Zod for schema validation

## Environment Variables

- `EASYPOST_API_KEY` - EasyPost API key (use "mock" for testing)
- `VEEQO_API_KEY` - Veeqo API key
- `LOG_LEVEL` - Logging level (default: "info")
- `NODE_ENV` - Environment mode
