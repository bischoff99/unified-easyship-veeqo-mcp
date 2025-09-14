****# Unified EasyPost-Veeqo MCP Server

A comprehensive Model Context Protocol (MCP) server that unifies EasyPost shipping services with Veeqo inventory management for complete shipping and inventory orchestration.

## 🚀 Features

### Core Functionality

- **Multi-Carrier Shipping**: EasyPost integration with USPS, UPS, FedEx, DHL, and more
- **International Shipping**: Full customs support with automatic international order detection
- **Inventory Management**: Veeqo integration for real-time inventory across multiple locations
- **Shipping Optimization**: Intelligent rate comparison and carrier selection
- **Real-time Tracking**: Comprehensive package tracking and status updates
- **Address Verification**: Automated address validation and correction
- **Webhook Support**: Real-time delivery status notifications

### Advanced Features

- **FastMCP Framework**: Modern MCP server implementation with session management
- **Authentication & Authorization**: Role-based access control with API key management
- **Structured Logging**: Comprehensive logging with pino for observability
- **Health Monitoring**: Built-in health checks and performance monitoring
- **Mock Mode**: Development-friendly mock responses for testing

### Advanced Analytics

- **Shipping Analytics**: Comprehensive shipping performance and cost analysis
- **Inventory Analytics**: Real-time inventory tracking and optimization
- **Performance Monitoring**: Built-in performance metrics and health checks
- **Cost Optimization**: Intelligent rate comparison and carrier selection
- **Real-time Insights**: Live shipping and inventory analytics

### Premium Integrations

- **Advanced Analytics**: Comprehensive shipping and inventory analytics
- **Warp Terminal Pro**: Enhanced terminal experience
- **Railway Hobby**: Cloud deployment and hosting

## 📊 Project Status

### ✅ **Completed Features**

- **EasyPost Integration**: Full shipping API with international support
- **Veeqo Integration**: Complete inventory management with 14 working endpoints
- **International Shipping**: Customs data structure enforcement
- **MCP Server**: FastMCP implementation with all tools
- **Webhook Support**: Delivery status notifications setup
- **Documentation**: Comprehensive guides and examples
- **Testing**: Production API testing completed
- **Modern Toolchain**: pnpm, ESLint v9, Node.js 22, TypeScript

### 🔄 **Current Status**

- **Production Ready**: All integrations tested and working
- **API Coverage**: 100% of working endpoints implemented
- **Documentation**: Complete setup and usage guides
- **Webhooks**: Ready for delivery status notifications
- **CI/CD Pipeline**: Fully functional with 41/41 tests passing
- **Modern Development**: Latest toolchain with flat ESLint config

### 🎯 **Ready for**

- **Production Deployment**: All systems tested and validated
- **Boutique Network**: Multi-location inventory management
- **International Orders**: Customs-compliant shipping
- **Real-time Updates**: Webhook-driven notifications

## 📋 Prerequisites

- Node.js 22.0.0 or higher
- pnpm package manager (8.15.0+)
- EasyPost API key
- Veeqo API key
- (Optional) Additional API keys for extended features

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd unified-easyship-veeqo-mcp
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Setup development environment**

   ```bash
   # Setup Cursor environment
   ./scripts/setup-cursor.sh

   # Setup premium services (optional)
   ./scripts/setup-integrated-services.sh
   ```

## 🚀 Quick Start

### Development Mode

```bash
# Start the MCP server
pnpm run dev
```

### Production Mode

```bash
# Build the project
pnpm run build

# Start the server
pnpm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# EasyPost Configuration
EASYPOST_API_KEY=your_easypost_api_key_here
EASYPOST_BASE_URL=https://api.easypost.com/v2

# Veeqo Configuration
VEEQO_API_KEY=your_veeqo_api_key_here
VEEQO_BASE_URL=https://api.veeqo.com

# Logging Configuration
LOG_LEVEL=info
NODE_ENV=development

# Server Configuration
PORT=3000

# AI Configuration (Optional)
# Additional API keys for extended features (optional)
```

### Mock Mode

For development and testing, you can use mock mode by setting:

```bash
EASYPOST_API_KEY=mock
VEEQO_API_KEY=mock
```

This will return realistic mock data without making actual API calls.

## ⚡ Development Workflow

### Modern Toolchain (2025)

- **Package Manager**: pnpm 8.15.0+ for faster, reliable dependency management
- **Node.js**: Version 22 with latest features and performance improvements
- **ESLint**: v9 with modern flat configuration for consistent code quality
- **TypeScript**: Latest with strict type checking and path aliases
- **Vitest**: Fast, modern test runner with comprehensive coverage
- **GitHub Actions**: v5 with automated CI/CD pipeline

### Development Commands

```bash
# Full development cycle
pnpm install          # Install dependencies
pnpm run lint:check   # Check code quality
pnpm run type-check   # Verify TypeScript
pnpm test            # Run test suite
pnpm run build       # Build for production

# Development server
pnpm run dev  # Start with hot reload
```

### Quality Assurance

- **Linting**: ESLint v9 with TypeScript rules and import management
- **Type Safety**: Strict TypeScript with comprehensive type definitions
- **Testing**: 41 tests across unit and integration suites
- **CI Pipeline**: Automated testing, linting, and build verification

## 📚 API Documentation

### MCP Tools

#### Shipping Tools

- **`calculate_shipping_rates`**: Calculate shipping rates from multiple carriers
- **`create_shipping_label`**: Generate shipping labels with tracking
- **`track_shipment`**: Track packages in real-time

#### Inventory Tools

- **`get_inventory_levels`**: Get current inventory levels across locations
- **`update_inventory_levels`**: Update inventory levels in bulk

#### AI Tools

- **`optimize_shipping`**: AI-powered shipping optimization
- **`analyze_shipping_code`**: AI code analysis for shipping logic

### MCP Resources

- **`shipping://rates/{from_zip}/{to_zip}`**: Dynamic shipping rates by ZIP codes
- **`inventory://status/{product_id}`**: Product inventory status

### MCP Prompts

- **`shipping_optimization`**: Generate AI-powered shipping recommendations
- **`shipping_code_review`**: Review shipping-related code for best practices

## 🏗️ Architecture

### MCP Server

The unified server implementation using the FastMCP framework:

```typescript
import { FastMCP } from 'fastmcp';

const server = new FastMCP({
  name: 'unified-easyship-veeqo-mcp',
  version: '1.0.0',
  authenticate: async (request) => {
    // API key authentication
  },
  // ... configuration
});
```

### Enhanced API Clients

#### EasyPost Client

```typescript
import { EasyPostClient } from './clients/easypost-enhanced.js';

const client = new EasyPostClient();
const rates = await client.getRates(fromAddress, toAddress, parcel);
```

#### Veeqo Client

```typescript
import { VeeqoClient } from './clients/veeqo-enhanced.js';

const client = new VeeqoClient();
const inventory = await client.getInventoryLevels();
```

### AI Integration

```typescript
// AI integration removed - using basic rate comparison

const optimization = await optimizeShipping({
  package: packageDetails,
  requirements: shippingRequirements,
  origin: 'San Francisco, CA',
  destination: 'New York, NY',
});
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Test specific file
pnpm test test/unit/services/easypost-client.test.ts

# Lint code
pnpm run lint:check

# Type check
pnpm run type-check
```

### Test Infrastructure

- **Unit Tests**: 16 tests for core services
- **Integration Tests**: 25 tests for API integrations
- **Mock Mode**: Complete mock implementations for development
- **Coverage**: Comprehensive test coverage across all modules

## 🚀 Deployment

### Railway Deployment

```bash
# Deploy to Railway
pnpm run deploy:railway

# Check deployment status
pnpm run status:railway

# View logs
pnpm run logs:railway
```

### Docker Deployment

```bash
# Build Docker image
pnpm run docker:build

# Run Docker container
pnpm run docker:run
```

## 📊 Monitoring

### Health Checks

- **Endpoint**: `GET /health`
- **Response**: Server status and version information

### Logging

- **Format**: Structured JSON logging with pino
- **Levels**: debug, info, warn, error
- **Fields**: timestamp, level, message, context

### Metrics

- Request timing and success rates
- API call statistics
- Error tracking and reporting

## 🔒 Security

### Authentication

- API key-based authentication
- Role-based access control (admin/user)
- Secure session management

### Data Protection

- Input validation with Zod schemas
- Secure error handling
- No sensitive data in logs

### Best Practices

- HTTPS-only communication
- Request timeout management
- Rate limiting and throttling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- [Project Structure](PROJECT_STRUCTURE.md)
- [Cursor Setup Guide](CURSOR_SETUP.md)
- [Premium Integration Guide](PREMIUM_INTEGRATION_GUIDE.md)
- [Quick Setup Guide](QUICK_SETUP.md)

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page
- Review the documentation
- Contact support via email

## 🎯 Roadmap

### Phase 1 (Current)

- ✅ Core MCP server implementation
- ✅ EasyPost and Veeqo integration
- ✅ AI-powered optimization
- ✅ Authentication and security

### Phase 2 (Next)

- 🔄 Advanced analytics dashboard
- 🔄 Machine learning optimization
- 🔄 Webhook integration
- 🔄 Mobile API support

### Phase 3 (Future)

- 📋 Multi-tenant architecture
- 📋 GraphQL API
- 📋 Microservices decomposition
- 📋 Advanced caching layer

## 🙏 Acknowledgments

- [EasyPost](https://www.easypost.com/) for shipping API services
- [Veeqo](https://www.veeqo.com/) for inventory management
- [FastMCP](https://github.com/punkpeye/fastmcp) for the MCP framework

---

## Built with ❤️ for the shipping and logistics community
