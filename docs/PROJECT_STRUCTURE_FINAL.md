# Unified EasyPost-Veeqo MCP Server - Final Project Structure

## Overview

This is a comprehensive Model Context Protocol (MCP) server that unifies EasyPost shipping and Veeqo inventory management APIs, enhanced with AI-powered analytics and optimization capabilities.

## Project Architecture

```
unified-easyship-veeqo-mcp/
├── 📁 src/                          # Source code
│   ├── 📁 api/                      # API layer
│   │   ├── 📁 tools/                # MCP tools implementation
│   │   │   ├── 📄 health.ts         # Health check tool
│   │   │   ├── 📄 parcel-presets.ts # Parcel presets tool
│   │   │   ├── 📄 create-shipment.ts# Shipment creation
│   │   │   ├── 📄 track-shipment.ts # Shipment tracking
│   │   │   ├── 📄 get-shipping-rates.ts # Rate calculation
│   │   │   ├── 📄 verify-address.ts # Address verification
│   │   │   ├── 📄 get-inventory.ts  # Inventory management
│   │   │   ├── 📄 update-stock.ts   # Stock updates
│   │   │   ├── 📄 get-orders.ts     # Order management
│   │   │   ├── 📄 create-order.ts   # Order creation
│   │   │   ├── 📄 optimize-shipping.ts # AI optimization
│   │   │   ├── 📄 forecast-demand.ts # Demand forecasting
│   │   │   ├── 📄 analyze-shipping-patterns.ts # Pattern analysis
│   │   │   └── 📄 index.ts          # Tools export
│   │   └── 📁 schemas/              # Zod validation schemas
│   │       ├── 📄 address.ts        # Address schemas
│   │       ├── 📄 shipment.ts       # Shipment schemas
│   │       ├── 📄 inventory.ts      # Inventory schemas
│   │       ├── 📄 order.ts          # Order schemas
│   │       └── 📄 index.ts          # Schema exports
│   ├── 📁 core/                     # Core server functionality
│   │   ├── 📄 server.ts             # Legacy MCP server
│   │   ├── 📄 client.js             # EasyPost client
│   │   ├── 📄 types.ts              # Type definitions
│   │   ├── 📄 errors.ts             # Error handling
│   │   └── 📄 index.ts              # Core exports
│   ├── 📁 server/                   # Modern server implementations
│   │   └── 📄 fastmcp-server.ts     # FastMCP server (main)
│   ├── 📁 services/                 # Service layer
│   │   ├── 📁 clients/              # API clients
│   │   │   ├── 📄 easypost-enhanced.ts # Enhanced EasyPost client
│   │   │   └── 📄 veeqo-enhanced.ts    # Enhanced Veeqo client
│   │   ├── 📁 integrations/         # AI integrations
│   │   │   ├── # Claude Code SDK integration removed
│   │   │   └── # Hugging Face integration removed
│   │   └── 📄 index.ts              # Service exports
│   ├── 📁 config/                   # Configuration management
│   │   └── 📄 index.ts              # Centralized config
│   └── 📁 utils/                    # Utilities
│       ├── 📄 env.js                # Environment handling
│       └── 📄 logger.js             # Logging configuration
├── 📁 tests/                        # Test suite
│   ├── 📁 unit/                     # Unit tests
│   │   └── 📄 example.test.ts       # Example unit test
│   └── 📁 integration/              # Integration tests
│       └── 📄 server.test.ts        # Server integration test
├── 📁 docs/                         # Documentation
├── 📁 examples/                     # Usage examples
├── 📁 .vscode/                      # VS Code/Cursor configuration
│   ├── 📄 settings.json             # Editor settings
│   ├── 📄 extensions.json           # Recommended extensions
│   ├── 📄 launch.json               # Debug configuration
│   └── 📄 tasks.json                # Build tasks
├── 📄 package.json                  # Project dependencies & scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 .env.example                  # Environment template
├── 📄 .cursorrules                  # Cursor AI rules
├── 📄 .cursorignore                 # Cursor ignore patterns
├── 📄 vibe-tools.config.json        # Vibe tools configuration
├── 📄 railway.json                  # Railway deployment config
├── 📄 .warp-config.json             # Warp Terminal config
└── 📄 README.md                     # Project documentation
```

## Key Features

### 🚀 MCP Server Implementation

- **FastMCP Server**: Modern, high-performance server using FastMCP framework
- **Legacy Server**: Traditional MCP server for compatibility
- **Tool Registry**: Comprehensive set of shipping and inventory tools
- **Schema Validation**: Zod-based input validation for all operations

### 📦 Shipping & Logistics

- **EasyPost Integration**: Complete shipping API coverage
  - Address verification
  - Rate calculation
  - Shipment creation and tracking
  - Label generation
- **Veeqo Integration**: Inventory and order management
  - Stock level monitoring
  - Order processing
  - Demand forecasting

### 🤖 AI-Powered Features

- **Claude Code SDK**: AI-powered shipping optimization
- **Hugging Face**: ML models for pattern analysis
- **Smart Recommendations**: Automated shipping suggestions
- **Demand Forecasting**: Predictive inventory management

### 🛠 Development Tools

- **Cursor Integration**: AI-powered development environment
- **Vibe Tools**: Repository analysis and planning
- **Railway Deployment**: Cloud deployment configuration
- **Warp Terminal**: Enhanced terminal experience

## Technology Stack

### Core Technologies

- **TypeScript**: Primary development language
- **Node.js**: Runtime environment
- **FastMCP**: Modern MCP server framework
- **Zod**: Schema validation
- **Pino**: Structured logging

### API Integrations

- **EasyPost API**: Shipping and logistics
- **Veeqo API**: Inventory management
- **Claude Code SDK**: AI optimization
- **Hugging Face**: Machine learning models

### Development Tools

- **Cursor**: AI-powered IDE
- **Vitest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Railway**: Cloud deployment

## Environment Configuration

### Required Environment Variables

```bash
# API Keys
EASYPOST_API_KEY="your_easypost_api_key"
VEEQO_API_KEY="your_veeqo_api_key"
# CLAUDE_CODE_API_KEY="your_claude_code_api_key" # Claude Code SDK removed
HUGGING_FACE_HUB_TOKEN="your_hugging_face_hub_token"
RAILWAY_TOKEN="your_railway_token"

# Optional Configuration
EASYPOST_BASE_URL="https://api.easypost.com/v2"
VEEQO_BASE_URL="https://api.veeqo.com"
LOG_LEVEL="info"
NODE_ENV="development"
```

## Scripts & Commands

### Development

```bash
npm run dev              # Start development server
npm run dev:fastmcp      # Start FastMCP development server
npm run build            # Build TypeScript
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

### Testing

```bash
npm test                 # Run unit tests
npm run test:coverage    # Run tests with coverage
npm run validate         # Validate MCP server
```

### Deployment

```bash
npm run deploy:railway   # Deploy to Railway
npm run logs:railway     # View Railway logs
npm run status:railway   # Check Railway status
```

### AI Tools

```bash
npm run ai:analyze       # Analyze shipping patterns
npm run ai:help          # Get AI assistance
```

## MCP Tools Available

### EasyPost Tools

- `ep.health` - Server health check
- `ep.parcel_presets` - Available parcel presets
- `ep.create_shipment` - Create new shipment
- `ep.track_shipment` - Track shipment status
- `ep.get_rates` - Get shipping rates
- `ep.verify_address` - Verify address validity

### Veeqo Tools

- `vq.get_inventory` - Get inventory levels
- `vq.update_stock` - Update stock quantities
- `vq.get_orders` - Retrieve orders
- `vq.create_order` - Create new order

### AI-Powered Tools

- `ai.optimize_shipping` - AI shipping optimization
- `ai.forecast_demand` - Demand forecasting
- `ai.analyze_patterns` - Shipping pattern analysis

## Best Practices

### Code Organization

- **Modular Architecture**: Clear separation of concerns
- **Type Safety**: Comprehensive TypeScript usage
- **Error Handling**: Centralized error management
- **Logging**: Structured logging with Pino

### API Design

- **RESTful Patterns**: Consistent API design
- **Schema Validation**: Zod-based validation
- **Rate Limiting**: Built-in rate limiting
- **Retry Logic**: Exponential backoff for failures

### Security

- **Environment Variables**: Secure credential management
- **Input Validation**: Comprehensive input sanitization
- **Error Sanitization**: No sensitive data in error messages
- **CORS Configuration**: Proper cross-origin handling

## Deployment

### Railway Deployment

The project is configured for Railway deployment with:

- Automatic builds from Git
- Environment variable management
- Health checks and monitoring
- Log aggregation

### Local Development

- Hot reloading with `tsx watch`
- Environment variable validation
- Mock API responses for testing
- Comprehensive logging

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`
4. Configure environment variables
5. Start development server: `npm run dev`

### Code Standards

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation for API changes

## Support

For issues and questions:

- Check the documentation in `/docs`
- Review the examples in `/examples`
- Use the AI tools for assistance: `npm run ai:help`

---

_This project structure follows MCP best practices and provides a solid foundation for shipping and inventory management automation._
