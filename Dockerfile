# Multi-stage build for production-ready MCP server
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build:production

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcpuser

# Copy the built application
COPY --from=builder --chown=mcpuser:nodejs /app/dist ./dist
COPY --from=builder --chown=mcpuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:nodejs /app/package.json ./package.json

# Copy configuration files
COPY --chown=mcpuser:nodejs mcp.json ./
COPY --chown=mcpuser:nodejs railway.toml ./

# Create logs directory
RUN mkdir -p /app/logs && chown mcpuser:nodejs /app/logs

# Switch to non-root user
USER mcpuser

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "import('http').then(http => { const req = http.request({hostname: 'localhost', port: process.env.PORT || 3000, path: '/health', method: 'GET'}, res => { process.exit(res.statusCode === 200 ? 0 : 1) }); req.on('error', () => process.exit(1)); req.end(); })"

# Start the application
CMD ["node", "dist/server.js"]