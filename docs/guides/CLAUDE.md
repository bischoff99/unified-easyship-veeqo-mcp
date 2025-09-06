# CLAUDE.md

This file provides guidance to Claude Code (
claude.ai/code) when working with code in this repository.

## Project Overview

Unified MCP server integrating EasyPost shipping services with Veeqo inventory management, optionally enhanced with AI-powered optimization using Claude Code SDK.

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
- `src/services/integrations/claude-code.ts` - AI integration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Development Notes

- Uses TypeScript with strict type checking
- Implements FastMCP framework for MCP server
- Integrates EasyPost and Veeqo APIs
- Includes AI-powered shipping optimization
- Follows structured logging with pino
- Uses Zod for schema validation

## Environment Variables

- `EASYPOST_API_KEY` - EasyPost API key (use "mock" for testing)
- `VEEQO_API_KEY` - Veeqo API key
- `LOG_LEVEL` - Logging level (default: "info")
- `NODE_ENV` - Environment mode
