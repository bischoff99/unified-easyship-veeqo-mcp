# Docker Guide for Unified EasyPost-Veeqo MCP Server

This guide covers Docker setup, deployment, and management for the Unified EasyPost-Veeqo MCP Server.

## 🐳 Docker Files Overview

- **`Dockerfile`** - Production-ready multi-stage build
- **`Dockerfile.dev`** - Development environment with hot reload
- **`docker-compose.yml`** - Orchestration for multiple services
- **`.dockerignore`** - Optimized build context

## 🚀 Quick Start

### Production Deployment

```bash
# Build and run production container
npm run docker:build
npm run docker:run

# Or use docker-compose
npm run docker:compose:up
```

### Development Environment

```bash
# Build and run development container with hot reload
npm run docker:build:dev
npm run docker:run:dev

# Or use docker-compose
npm run docker:compose:dev
```

## 📋 Available Docker Commands

### Build Commands

- `npm run docker:build` - Build production image
- `npm run docker:build:dev` - Build development image
- `npm run docker:compose:build` - Build all compose services

### Run Commands

- `npm run docker:run` - Run production container
- `npm run docker:run:dev` - Run development container with volume mounting
- `npm run docker:compose:up` - Start all services
- `npm run docker:compose:dev` - Start development services
- `npm run docker:compose:fastmcp` - Start FastMCP variant

### Management Commands

- `npm run docker:compose:down` - Stop all services
- `npm run docker:compose:logs` - View logs
- `npm run docker:clean` - Clean up Docker system

## 🏗️ Docker Architecture

### Multi-Stage Production Build

1. **Base Stage** - Node.js 20 Alpine base image
2. **Dependencies Stage** - Install production dependencies only
3. **Builder Stage** - Build TypeScript application
4. **Runner Stage** - Minimal production image with non-root user

### Security Features

- **Non-root user** (`mcpuser:nodejs`)
- **Minimal Alpine Linux** base image
- **Health checks** for container monitoring
- **Proper file permissions** and ownership

### Environment Variables

Required environment variables:

- `EASYPOST_API_KEY` - EasyPost API key (use "mock" for testing)
- `VEEQO_API_KEY` - Veeqo API key

Optional environment variables:

- `NODE_ENV` - Environment mode (default: production)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)

## 🔧 Docker Compose Services

### Main Services

1. **mcp-server** - Production MCP server (port 3000)
2. **mcp-server-dev** - Development server with hot reload (port 3001)
3. **mcp-server-fastmcp** - FastMCP variant (port 3002)

### Service Profiles

- **Default** - Production services only
- **dev** - Development services with hot reload
- **fastmcp** - FastMCP server variant

## 📊 Health Monitoring

All containers include health checks that:

- Check HTTP endpoint `/health` every 30 seconds
- Timeout after 3 seconds
- Retry 3 times before marking unhealthy
- Wait 5 seconds before starting checks

## 🗂️ Volume Mounts

### Development

- Source code mounted for hot reload
- Node modules volume for performance
- Logs directory for persistent logging

### Production

- Logs directory only
- No source code mounting for security

## 🚀 Deployment Examples

### Local Development

```bash
# Start development environment
docker-compose --profile dev up -d

# View logs
docker-compose logs -f mcp-server-dev

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build and deploy
docker-compose up -d

# Check health
docker-compose ps

# View logs
docker-compose logs -f mcp-server
```

### Railway Deployment

The Dockerfile is optimized for Railway deployment:

```bash
# Deploy to Railway
npm run deploy:railway
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts** - Ensure ports 3000, 3001, 3002 are available
2. **Environment variables** - Set required API keys
3. **Build failures** - Check Docker daemon is running
4. **Permission issues** - Ensure proper file ownership

### Debug Commands

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 mcp-server

# Execute shell in container
docker-compose exec mcp-server sh

# Check health status
docker inspect --format='{{.State.Health.Status}}' unified-easyship-veeqo-mcp
```

### Performance Optimization

1. **Use .dockerignore** - Reduces build context size
2. **Multi-stage builds** - Minimizes final image size
3. **Alpine Linux** - Smaller base image
4. **Production dependencies only** - Reduces attack surface

## 📈 Monitoring and Logging

### Log Management

- Logs are written to `/app/logs` inside container
- Mount logs volume for persistence
- Use structured logging with pino

### Health Checks

- HTTP endpoint: `GET /health`
- Returns 200 OK when healthy
- Includes service status and dependencies

### Metrics

- Container resource usage via Docker stats
- Application metrics via built-in monitoring
- Health check results in container status

## 🔒 Security Best Practices

1. **Non-root user** - Runs as `mcpuser` (UID 1001)
2. **Minimal image** - Only necessary files included
3. **No secrets in image** - Use environment variables
4. **Health checks** - Monitor container health
5. **Read-only filesystem** - Where possible

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Guide](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Alpine Linux Security](https://alpinelinux.org/about/)

## 🤝 Contributing

When adding Docker-related changes:

1. Update this documentation
2. Test all Docker commands
3. Ensure security best practices
4. Update package.json scripts if needed
5. Test on multiple platforms (Linux, macOS, Windows)
