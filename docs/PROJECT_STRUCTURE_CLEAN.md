# 🏗️ Unified EasyPost-Veeqo MCP Server - Project Structure

## 📋 Overview

This document outlines the clean, organized project structure for the Unified EasyPost-Veeqo MCP Server after comprehensive reorganization and modernization.

## 🌳 Directory Structure

```
unified-easyship-veeqo-mcp/
│
├── 📁 src/                          # Source code
│   ├── 📁 api/                      # API schemas and validation
│   │   ├── 📁 schemas/              # Zod validation schemas
│   │   │   ├── address.ts           # Address validation schema
│   │   │   ├── index.ts             # Schema exports
│   │   │   └── parcel.ts            # Parcel validation schema
│   │   └── client.ts                # API client utilities
│   │
│   ├── 📁 config/                   # Configuration management
│   │   └── index.ts                 # Centralized config with Zod validation
│   │
│   ├── 📁 core/                     # Core business logic
│   │   ├── 📁 tools/                # MCP tools implementation
│   │   │   ├── health.ts            # Health check tool
│   │   │   ├── index.ts             # Tool definitions and exports
│   │   │   ├── parcel-presets.ts    # Shipping package presets
│   │   │   ├── verify-address.ts    # Address verification tool
│   │   │   └── weight-to-oz.ts      # Weight conversion tool
│   │   ├── client.ts                # Basic EasyPost client
│   │   ├── index.ts                 # Core exports
│   │   ├── server.ts                # Core MCP server implementation
│   │   └── types.ts                 # Core type definitions
│   │
│   ├── 📁 middleware/               # Server middleware
│   │   ├── auth.ts                  # Authentication middleware
│   │   ├── health-checks.ts         # Health monitoring middleware
│   │   └── performance-tracking.ts  # Performance monitoring
│   │
│   ├── 📁 server/                   # Server implementations
│   │   └── fastmcp-server.ts        # FastMCP server (main entry point)
│   │
│   ├── 📁 services/                 # External services and integrations
│   │   ├── 📁 clients/              # API clients
│   │   │   ├── easypost-enhanced.ts      # Enhanced EasyPost client
│   │   │   ├── easypost-shipping-adapter.ts # EasyPost adapter
│   │   │   ├── veeqo-enhanced.ts         # Enhanced Veeqo client
│   │   │   ├── veeqo-shipping-adapter.ts # Veeqo adapter
│   │   │   └── veeqo.ts                  # Basic Veeqo client
│   │   ├── 📁 integrations/         # Third-party integrations
│   │   │   ├── # Claude Code SDK integration removed
│   │   │   ├── claude-oauth.ts      # Claude OAuth integration
│   │   │   └── # Hugging Face integration removed
│   │   └── index.ts                 # Services exports
│   │
│   └── 📁 utils/                    # Shared utilities
│       ├── auth-utils.ts            # Authentication utilities
│       ├── env.ts                   # Environment management
│       ├── errors.ts                # Error handling and definitions
│       ├── logger.ts                # Structured logging (Pino)
│       └── performance-monitor.ts   # Performance monitoring utilities
│
├── 📁 test/                         # Test suite
│   ├── 📁 integration/              # Integration tests
│   │   ├── fastmcp-server.test.ts   # FastMCP server integration tests
│   │   ├── server.test.ts           # Core server integration tests
│   │   └── shipping-adapters.test.ts # Shipping adapter tests
│   ├── 📁 mocks/                    # Mock data and utilities
│   │   ├── easypost.ts              # EasyPost mock data
│   │   └── veeqo.ts                 # Veeqo mock data
│   ├── 📁 unit/                     # Unit tests
│   │   ├── 📁 services/             # Service unit tests
│   │   │   └── easypost-client.test.ts # EasyPost client unit tests
│   │   └── example.test.ts          # Example/template tests
│   └── setup.ts                     # Test environment setup
│
├── 📁 docs/                         # Documentation
│   ├── 📁 examples/                 # Code examples
│   ├── 📁 guides/                   # User guides
│   └── *.md                         # Various documentation files
│
├── 📁 scripts/                      # Utility scripts
│   ├── 📁 testing/                  # Testing scripts
│   ├── 📁 webhooks/                 # Webhook utilities
│   └── *.{js,sh}                    # Various utility scripts
│
├── 📁 test-output/                  # Test results and reports
│
├── 📁 .github/                      # GitHub configuration
│   └── 📁 workflows/                # CI/CD workflows
│
├── 📁 .claude/                      # Claude Code settings
├── 📁 .cursor/                      # Cursor editor settings
└── 📁 eslint-plugin-fastmcp/        # Custom ESLint plugin

## Configuration Files (Root Level)
├── eslint.config.js                 # ESLint v9 flat configuration
├── tsconfig.json                    # TypeScript base configuration
├── tsconfig.eslint.json             # TypeScript config for linting
├── tsconfig.test.json               # TypeScript config for tests
├── vitest.config.ts                 # Vitest test configuration
├── package.json                     # Package dependencies and scripts
├── pnpm-lock.yaml                   # pnpm lockfile
└── README.md                        # Project documentation
```

## 🎯 Key Features of Clean Structure

### ✅ **Logical Organization**

- **Clear separation of concerns** between core, services, and utilities
- **Dedicated directories** for each major functionality area
- **Consistent naming conventions** throughout the project

### ✅ **Modern Configuration**

- **ESLint v9** with flat configuration format
- **TypeScript** with strict settings and path aliases
- **Vitest** for fast, modern testing
- **pnpm** for efficient dependency management

### ✅ **Test Organization**

- **Separate unit and integration** test directories
- **Comprehensive mock data** for reliable testing
- **41 tests** covering core functionality
- **Test setup** with proper environment configuration

### ✅ **Documentation Structure**

- **Centralized docs** directory with guides and examples
- **Inline code documentation** with TSDoc comments
- **Project documentation** files in root for easy access

## 📊 File Count Summary

| Directory  | Files        | Description                     |
| ---------- | ------------ | ------------------------------- |
| `src/`     | 27 files     | Source code implementation      |
| `test/`    | 8 files      | Test suite                      |
| `docs/`    | 15 files     | Documentation and guides        |
| `scripts/` | 20 files     | Utility and deployment scripts  |
| Root       | 13 files     | Configuration and documentation |
| **Total**  | **83 files** | Clean, organized codebase       |

## 🔧 Development Workflow

### **Modern Toolchain (2025)**

- **Node.js 22** - Latest LTS with modern features
- **pnpm 8.15.0+** - Fast, reliable dependency management
- **TypeScript** - Strict type checking with path aliases
- **ESLint v9** - Modern flat configuration
- **Vitest** - Fast test runner with coverage
- **GitHub Actions v5** - Automated CI/CD

### **Development Commands**

```bash
# Install dependencies
pnpm install

# Development cycle
pnpm run lint:check   # Code quality check
pnpm run type-check   # TypeScript validation
pnpm test            # Test suite
pnpm run build       # Production build

# Development server
pnpm run dev:fastmcp  # Start FastMCP server
```

## ✨ Clean Architecture Benefits

1. **🔍 Easy Navigation**: Clear directory structure makes finding code intuitive
2. **🔧 Maintainable**: Separation of concerns enables easier updates
3. **🧪 Testable**: Well-organized test structure with comprehensive coverage
4. **📚 Documented**: Centralized documentation with examples
5. **🚀 Modern**: Latest toolchain and best practices
6. **⚡ Performant**: Optimized build and development workflow

## 🎯 Quality Standards

- **✅ 41/41 tests passing**
- **✅ ESLint clean** (no warnings)
- **✅ TypeScript strict** mode enabled
- **✅ Modern dependencies** (all major versions updated)
- **✅ Zero security vulnerabilities**
- **✅ Comprehensive documentation**

This clean structure provides a solid foundation for continued development, testing, and deployment of the Unified EasyPost-Veeqo MCP Server.
