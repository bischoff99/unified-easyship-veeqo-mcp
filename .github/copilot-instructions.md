# Unified EasyPost-Veeqo MCP Server

Always follow these instructions first and only fall back to additional search or context gathering when the information here is incomplete or found to be in error.

## Working Effectively

### Bootstrap, Build, and Test the Repository

1. **Install dependencies** (takes ~30 seconds):

   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Type check** (takes ~3 seconds):

   ```bash
   pnpm run type-check
   ```

3. **Build the project** (takes ~3 seconds):

   ```bash
   pnpm run build
   ```

4. **Run linting** (takes ~5 seconds):

   ```bash
   pnpm run lint:check
   ```

5. **Run tests** (takes ~7 seconds, 85 tests):
   ```bash
   pnpm test
   ```

### Development Workflow

- **Development server with hot reload**:

  ```bash
  EASYPOST_API_KEY="mock" VEEQO_API_KEY="mock" pnpm run dev:fastmcp
  ```

- **Production server**:

  ```bash
  EASYPOST_API_KEY="mock" VEEQO_API_KEY="mock" pnpm run start:fastmcp
  ```

- **Build for production**:
  ```bash
  pnpm run build:production
  ```

### Quality Assurance Commands

Always run these before committing changes or the CI will fail:

```bash
# Check code quality - NOTE: format:check currently fails due to many unformatted files
pnpm run quality:check     # Runs lint:check + format:check + type-check

# Individual quality checks (recommended approach)
pnpm run lint:check        # Check linting (passes)
pnpm run type-check        # Check TypeScript types (passes)
pnpm run format:check      # Check formatting (currently fails - 116 files need formatting)

# Fix code quality issues
pnpm run quality:fix       # Runs lint:fix + format (will fix 116 files)

# Run full test suite
pnpm run test:ci          # Runs tests with coverage and JUnit output
```

## Validation

### Manual Validation Requirements

Always manually validate changes by:

1. **Building and starting the server**:

   ```bash
   pnpm run build
   EASYPOST_API_KEY="mock" VEEQO_API_KEY="mock" pnpm run start:fastmcp
   ```

2. **Verify server starts correctly** - should see logs showing:
   - "Development API keys initialized"
   - "EasyPost client initialized in mock mode"
   - "Veeqo client initialized in mock mode"
   - "Server tools and resources loaded"
   - "Starting FastMCP server..."
   - "Client connected"

3. **Test development hot reload**:

   ```bash
   EASYPOST_API_KEY="mock" VEEQO_API_KEY="mock" pnpm run dev:fastmcp
   ```

4. **Verify all tests pass**:
   ```bash
   pnpm test
   ```

### Integration Testing

Test the complete workflow after any significant changes:

```bash
# Run integration validation script
bash scripts/validate.sh

# Test specific integration suites
pnpm run test:integration
pnpm run test:unit
```

## Project Structure

### Key Directories

- **`src/server/`** - MCP server implementation
  - `fastmcp-server.ts` - Main FastMCP server entry point
  - `tools/` - MCP tool implementations (shipping, inventory, AI)

- **`src/services/`** - Business logic and API clients
  - `clients/easypost-enhanced.ts` - EasyPost shipping integration
  - `clients/veeqo-enhanced.ts` - Veeqo inventory integration
  - `integrations/claude-code.ts` - AI-powered optimization

- **`src/middleware/`** - Authentication, health checks, monitoring
- **`src/utils/`** - Helper functions, logging, error handling
- **`src/config/`** - Configuration management and validation

### Key Files

- **`package.json`** - Uses pnpm 8.15.0, Node.js 22+, extensive npm scripts
- **`tsconfig.json`** - Strict TypeScript configuration with path aliases
- **`vitest.config.ts`** - Test configuration using Vitest
- **`.env.example`** - Complete environment variable documentation

### Built Output

After running `pnpm run build`, the compiled JavaScript is in:

- **`dist/server/fastmcp-server.js`** - Main server entry point
- **`dist/`** - All compiled TypeScript files

## Environment Configuration

### Required Environment Variables

Set these for development (can use "mock" values):

```bash
# API Keys - use "mock" for development without real API calls
export EASYPOST_API_KEY="mock"
export VEEQO_API_KEY="mock"

# Optional for full functionality
export CLAUDE_CODE_API_KEY="your_key_here"
export HUGGING_FACE_HUB_TOKEN="your_token_here"
```

### Environment Files

- **`.env.example`** - Complete documentation of all environment variables
- **`.env.test`** - Test environment configuration
- **`.env.production`** - Production environment template

## Development Tools and Package Manager

- **Package Manager**: pnpm 8.15.0+ (faster than npm, required)
- **Node.js**: Version 22+ (specified in engines and volta config)
- **TypeScript**: Latest with strict type checking and path aliases
- **ESLint**: v9 with flat configuration and TypeScript rules
- **Vitest**: Fast test runner with coverage support
- **Prettier**: Code formatting (note: many files currently need formatting)

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that:

- Integrates **EasyPost** shipping services (multi-carrier shipping, international support)
- Connects to **Veeqo** inventory management (real-time inventory across locations)
- Provides **AI-powered optimization** using Claude Code SDK
- Implements **FastMCP framework** for modern MCP server capabilities
- Supports **real-time tracking**, address verification, and webhook notifications

### Major Integrations

- **EasyPost API**: Shipping rates, label creation, tracking, address validation
- **Veeqo API**: Inventory management, order processing, location tracking
- **Claude Code SDK**: AI-powered shipping optimization and code analysis
- **FastMCP**: Modern MCP server framework with session management

## Common Development Tasks

### Adding New Features

1. Always run quality checks first: `pnpm run quality:check`
2. Make changes to source code in `src/`
3. Add appropriate tests in `test/unit/` or `test/integration/`
4. Build and test: `pnpm run build && pnpm test`
5. Validate server functionality with manual testing
6. Run final quality check: `pnpm run quality:fix`

### Debugging

- **Enable debug logging**: Set `LOG_LEVEL=debug` in environment
- **Monitor performance**: Use `pnpm run perf:monitor`
- **Check deployment readiness**: `bash scripts/deployment-validation.sh`
- **View server logs**: Check structured JSON logs from pino logger

### Testing API Integrations

- **Use mock mode**: Set API keys to "mock" for development
- **Test scripts**: Check `scripts/testing/` for API testing examples
- **Integration tests**: Run `pnpm run test:integration`
- **Production API tests**: See `scripts/testing/test-*-production.js`

## Deployment

### Railway Deployment

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Build for production
pnpm run build:production

# Deploy to Railway
pnpm run deploy:railway

# Check deployment status
pnpm run status:railway
```

### Docker Deployment

```bash
# Build Docker image
pnpm run docker:build

# Run with Docker
pnpm run docker:run

# Use Docker Compose
pnpm run docker:compose:up
```

### Pre-deployment Validation

```bash
# Complete deployment preparation (Note: will fail due to formatting)
pnpm run deploy:prepare    # Runs quality:check + test:ci + build:production

# Validate deployment readiness (comprehensive validation script)
bash scripts/deployment-validation.sh   # Validates environment, dependencies, code quality

# Individual pre-deployment checks
pnpm run lint:check        # Code linting (passes)
pnpm run type-check        # TypeScript validation (passes)
pnpm run test:ci          # Full test suite with coverage
pnpm run build:production  # Production build
```

## Troubleshooting

### Common Issues

- **Build fails**: Ensure you're using pnpm 8.15.0+ and Node.js 22+
- **Tests fail**: Check environment variables are set correctly
- **Server won't start**: Verify `EASYPOST_API_KEY` and `VEEQO_API_KEY` are set (can use "mock")
- **Type errors**: Run `pnpm run type-check` to see specific TypeScript issues
- **Lint errors**: Run `pnpm run lint:fix` to auto-fix many issues

### Development Setup Issues

If you encounter issues:

1. **Reset dependencies**: `pnpm run reset`
2. **Update dependencies**: `pnpm run update:deps`
3. **Clean build**: `pnpm run clean && pnpm run build`
4. **Check Node version**: Ensure Node.js 22+ and pnpm 8.15.0+

## Repository Commands Quick Reference

```bash
# Essential commands (measured execution times)
pnpm install --frozen-lockfile  # Install dependencies (~30 seconds)
pnpm run type-check             # Type checking (~3 seconds)
pnpm run build                  # Build project (~3 seconds)
pnpm run lint:check             # Lint code (~5 seconds)
pnpm test                       # Run tests (~7 seconds, 85 tests)

# Development
pnpm run dev:fastmcp           # Development server with hot reload
pnpm run start:fastmcp         # Production server

# Quality assurance (Note: format:check currently fails for 116 files)
pnpm run lint:check            # Linting only (passes)
pnpm run type-check            # Type checking only (passes)
pnpm run quality:fix          # Fix quality issues (fixes formatting)

# Testing
pnpm run test:unit            # Unit tests only (~2 seconds, 17 tests)
pnpm run test:integration     # Integration tests only (~7 seconds, 68 tests)
pnpm run test:coverage        # Tests with coverage

# Deployment
pnpm run build:production     # Production build (~4 seconds)
pnpm run deploy:railway       # Deploy to Railway
```
