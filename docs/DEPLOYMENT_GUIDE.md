# Unified EasyPost-Veeqo MCP Server - Deployment Guide

## 🚀 Quick Start

Your MCP server is production-ready with validated functionality across all core features.

### Prerequisites

- Node.js 22+
- pnpm 8.15+
- EasyPost API key (production)
- Veeqo API key (production)

### Environment Setup

1. **Clone and install:**

```bash
git clone https://github.com/bischoff99/unified-easyship-veeqo-mcp.git
cd unified-easyship-veeqo-mcp
pnpm install
```

2. **Configure environment variables:**

```bash
# Copy example environment
cp .env.example .env.production

# Edit production environment
EASYPOST_API_KEY=your_live_easypost_key
VEEQO_API_KEY=your_veeqo_api_key
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Deployment Methods

## Option 1: Direct Node.js Deployment

```bash
# Build for production
pnpm run build:production

# Start server
pnpm run start:fastmcp
```

## Option 2: Docker Deployment

```bash
# Build Docker image
pnpm run docker:build

# Run with environment variables
pnpm run docker:run
```

## Option 3: Railway Deployment

```bash
# Deploy to Railway
pnpm run deploy:railway

# Monitor logs
pnpm run logs:railway
```

### Health Check Validation

After deployment, verify system health:

```bash
curl http://your-server:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "checks": [
    { "name": "memory", "status": "healthy" },
    { "name": "performance", "status": "healthy" },
    { "name": "environment", "status": "healthy" },
    { "name": "external_apis", "status": "healthy" }
  ]
}
```

### Validated Features ✅

- **Address Verification**: Real-time address validation via EasyPost
- **Shipping Rates**: Multi-carrier rate comparison (USPS, UPS, FedEx)
- **Inventory Sync**: Live Veeqo product and order integration
- **Performance**: <100ms response times with circuit breaker protection
- **Security**: API key rotation, rate limiting, CORS protection

### MCP Tools Available

1. `health` - System health and performance monitoring
2. `verifyAddress` - Address validation and standardization
3. `parcelPresets` - Standard shipping package dimensions
4. `weightToOz` - Weight unit conversions
5. `getRates` - Multi-carrier shipping rate comparison
6. `getProducts` - Veeqo inventory management
7. `getOrders` - Order processing and fulfillment

### Production Monitoring

Monitor key metrics:

- Memory usage (target: <100MB)
- API response times (target: <200ms)
- Error rates (target: <1%)
- External API availability

### Scaling Considerations

- **Horizontal**: Deploy multiple instances behind load balancer
- **Caching**: Implement Redis for frequently accessed rates/inventory
- **Database**: Add PostgreSQL for order history and analytics
- **CDN**: Cache static shipping data and documentation

### Support

- Repository: https://github.com/bischoff99/unified-easyship-veeqo-mcp
- Documentation: `/docs`
- Health endpoint: `/health`
- API status: All external APIs verified reachable

---

_Last updated: September 2025_
_Version: 1.0.0_
_Status: Production Ready ✅_
