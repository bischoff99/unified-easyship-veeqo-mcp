# 📁 **Project Structure**

## 🏗️ **Unified EasyPost-Veeqo MCP Server**

```
unified-easyship-veeqo-mcp/
├── 📁 src/                          # Source code
│   ├── 📁 server/                   # MCP server implementation
│   │   └── fastmcp-server.ts        # Main server file
│   ├── 📁 services/                 # Business logic
│   │   ├── 📁 clients/              # API clients
│   │   │   ├── easypost-enhanced.ts # EasyPost integration
│   │   │   └── veeqo-enhanced.ts    # Veeqo integration
│   │   ├── 📁 integrations/         # AI integrations
│   │   │   └── # Claude Code SDK removed
│   │   └── index.ts                 # Service exports
│   ├── 📁 middleware/               # Middleware functions
│   ├── 📁 utils/                    # Utility functions
│   └── 📁 config/                   # Configuration
├── 📁 dist/                         # Compiled JavaScript
├── 📁 docs/                         # Documentation
│   ├── 📁 guides/                   # User guides
│   │   ├── CLAUDE.md                # Claude integration guide
│   │   └── agent-workflows.md       # Agent workflow guide
│   ├── 📁 examples/                 # Code examples
│   │   ├── buy-label.js             # Label purchase example
│   │   └── order.json               # Sample order data
│   ├── DELIVERY_WEBHOOKS_GUIDE.md   # Webhook setup guide
│   ├── VEEQO_API_FIXES_SUMMARY.md   # Veeqo API fixes
│   ├── VEEQO_TESTING_GUIDE.md       # Veeqo testing guide
│   ├── DEPLOYMENT_ROADMAP.md        # Deployment guide
│   ├── QUICK_DEPLOYMENT_GUIDE.md    # Quick deployment
│   ├── PROJECT_STRUCTURE_FINAL.md   # Project structure
│   ├── international-order-structure.md # International orders
│   └── international-order-flow.txt     # Order flow
├── 📁 scripts/                      # Scripts and tools
│   ├── 📁 testing/                  # Test scripts
│   │   ├── test-veeqo-*.js          # Veeqo tests
│   │   ├── test-easypost-*.js       # EasyPost tests
│   │   ├── test-international-*.js  # International tests
│   │   └── scrape-veeqo-apis.js     # API scraper
│   └── 📁 webhooks/                 # Webhook tools
│       ├── setup-delivery-webhooks.js    # Webhook setup
│       └── webhook-handler-example.js    # Webhook handler
├── 📁 tests/                        # Unit tests
├── 📁 node_modules/                 # Dependencies
├── 📄 package.json                  # Project configuration
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 mcp.json                      # MCP server configuration
├── 📄 railway.json                  # Railway deployment config
├── 📄 README.md                     # Project overview
├── 📄 PROJECT_STRUCTURE.md          # This file
└── 📄 boutiques_final.csv           # Boutique data
```

## 🎯 **Key Directories:**

### **📁 src/** - Source Code

- **server/**: MCP server implementation
- **services/**: Business logic and API clients
- **middleware/**: Authentication and health checks
- **utils/**: Helper functions and logging
- **config/**: Configuration management

### **📁 docs/** - Documentation

- **guides/**: User guides and tutorials
- **examples/**: Code examples and samples
- **Root**: Main documentation files

### **📁 scripts/** - Tools and Scripts

- **testing/**: Test scripts for APIs
- **webhooks/**: Webhook setup and handlers

### **📁 tests/** - Unit Tests

- Automated test suites
- Integration tests
- Mock data and fixtures

## 🚀 **Quick Start:**

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Run tests
npm test
```

## 🔧 **Development:**

```bash
# Watch mode for development
npm run dev

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📋 **Key Files:**

- **`src/server/fastmcp-server.ts`** - Main MCP server
- **`src/services/clients/easypost-enhanced.ts`** - EasyPost integration
- **`src/services/clients/veeqo-enhanced.ts`** - Veeqo integration
- **`package.json`** - Project configuration
- **`mcp.json`** - MCP server configuration
- **`README.md`** - Project overview and setup

## 🎯 **Project Status:**

✅ **Completed:**

- EasyPost integration with international shipping
- Veeqo integration with inventory management
- MCP server implementation
- Webhook setup tools
- Comprehensive documentation
- Testing scripts

🔄 **In Progress:**

- Project cleanup and organization
- Final testing and validation

📋 **Next Steps:**

- Deploy to production
- Monitor webhook delivery
- Scale for boutique network
