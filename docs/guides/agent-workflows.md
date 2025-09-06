# Development Agent Workflows

This document outlines the specialized development agents and their workflows for the FastMCP server project.

## 1. Code Quality Agent

**Purpose**: Automated code quality enforcement and improvement

### Tools Configured:
- Enhanced ESLint with FastMCP-specific rules
- Custom ESLint plugin for MCP patterns
- Prettier for consistent formatting
- TypeScript strict checking
- Security vulnerability scanning

### Workflow:
```bash
# Daily quality check
npm run quality:check

# Fix common issues automatically
npm run quality:fix

# Check only FastMCP specific rules
npm run lint:fastmcp

# Pre-commit validation
npm run prebuild  # Runs automatically before build
```

### Key Features:
- **FastMCP-specific rules**: Tool naming conventions, error handling patterns
- **Security scanning**: Detects common vulnerabilities in API integrations
- **Import organization**: Enforces consistent module import patterns
- **Type safety**: Strict TypeScript checking with advanced rules

## 2. Testing Agent

**Purpose**: Comprehensive testing framework with mocks and coverage

### Tools Configured:
- Vitest for unit and integration testing
- Custom test utilities and matchers
- Mock data for EasyPost and Veeqo APIs
- Coverage reporting with threshold enforcement

### Workflow:
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# Test with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# CI pipeline testing
npm run test:ci

# End-to-end validation
npm run test:e2e
```

### Key Features:
- **Custom matchers**: `toBeValidMCPResponse()`, `toBeValidToolResult()`
- **API mocking**: Complete mock implementations for external services
- **Performance testing**: Tool execution time and memory usage validation
- **Integration validation**: Full server testing with mocked dependencies

## 3. Performance Monitoring Agent

**Purpose**: Real-time performance tracking and optimization

### Tools Configured:
- Performance monitoring utilities
- API call tracking with timing
- Memory usage analysis
- Optimization recommendations engine

### Workflow:
```bash
# Get current performance metrics
npm run perf:analyze

# Get optimization recommendations
npm run perf:recommendations

# Run server with monitoring enabled
npm run perf:monitor

# Analyze all performance aspects
npm run analyze:all
```

### Key Features:
- **Real-time tracking**: API response times, tool execution metrics
- **Memory monitoring**: Heap usage, garbage collection analysis
- **Optimization suggestions**: Automated recommendations based on patterns
- **Alerting**: Threshold-based warnings and errors
- **Historical data**: Performance trends over time

## 4. Documentation Agent

**Purpose**: Automated documentation generation and maintenance

### Tools Configured:
- Custom documentation generator for FastMCP tools
- JSDoc for API documentation
- Markdown generation for user guides
- Schema documentation extraction

### Workflow:
```bash
# Generate all documentation
npm run docs:build

# Generate only tool/API docs
npm run docs:generate

# Generate JSDoc API documentation
npm run docs:jsdoc

# Serve documentation locally
npm run docs:serve

# Update documentation in git
npm run docs:update
```

### Key Features:
- **Automatic extraction**: Tools, resources, and prompts from source code
- **Schema documentation**: Complete type definitions and validation rules
- **Integration guides**: Step-by-step setup instructions
- **API reference**: Comprehensive tool documentation with examples
- **Live serving**: Local documentation server for development

## 5. Deploy Agent

**Purpose**: Production-ready builds and deployment validation

### Tools Configured:
- Optimized build pipeline with analysis
- Health check system
- Graceful shutdown handling
- Production environment validation

### Workflow:
```bash
# Prepare for deployment
npm run deploy:prepare

# Validate deployment readiness
npm run deploy:validate

# Create deployment package
npm run deploy:package

# Check system health
npm run health:check

# Production build
npm run build:production

# Build with analysis
npm run build:analyze
```

### Key Features:
- **Build optimization**: Minification, bundling, source maps
- **Health monitoring**: System status, API connectivity, performance
- **Graceful shutdown**: Proper cleanup and connection handling
- **Environment validation**: Configuration and dependency checking
- **Bundle analysis**: Size optimization and dependency analysis

## Integrated Workflow

### Development Cycle:
```bash
# 1. Start development
npm run dev:fastmcp

# 2. Make changes, then validate
npm run quality:check
npm run test

# 3. Performance check
npm run perf:analyze

# 4. Update documentation
npm run docs:build

# 5. Prepare for deployment
npm run deploy:prepare
```

### CI/CD Pipeline:
```bash
# Quality gate
npm run quality:check

# Test gate  
npm run test:ci

# Performance analysis
npm run perf:analyze

# Documentation update
npm run docs:build

# Security audit
npm run analyze:security

# Build validation
npm run build:production

# Health validation
npm run health:check
```

### Maintenance Tasks:
```bash
# Weekly dependency updates
npm run update:deps

# Monthly security audit
npm run analyze:security

# Performance optimization review
npm run perf:recommendations

# Documentation review
npm run docs:build

# Clean build
npm run clean && npm run build:production
```

## Agent Integration Points

### Code Quality ↔ Testing
- ESLint rules enforce testable code patterns
- Test coverage gates prevent quality regression
- Custom rules validate test completeness

### Performance ↔ Testing
- Performance tests validate optimization thresholds
- Load testing uses performance monitoring data
- Regression testing catches performance degradation

### Documentation ↔ Code Quality
- JSDoc enforcement through ESLint rules
- API documentation generated from validated schemas
- Documentation tests ensure example accuracy

### Deploy ↔ All Agents
- Health checks validate all agent outputs
- Build process runs all quality gates
- Deployment requires all agent validation

## Configuration Files Summary

### ESLint Configuration
- `.eslintrc.json`: Main ESLint configuration
- `.eslintrc-fastmcp.json`: FastMCP-specific rules
- `eslint-plugin-fastmcp/`: Custom rules plugin

### Testing Configuration  
- `vitest.config.ts`: Vitest configuration
- `test/setup.ts`: Global test setup
- `test/mocks/`: Mock data and utilities

### Performance Configuration
- `src/utils/performance-monitor.ts`: Core monitoring
- `src/middleware/performance-tracking.ts`: Tracking decorators

### Documentation Configuration
- `jsdoc.config.json`: JSDoc configuration
- `scripts/generate-docs.js`: Documentation generator

### Deploy Configuration
- `scripts/build-optimize.js`: Build optimization
- `src/middleware/health-checks.ts`: Health monitoring
- `scripts/graceful-shutdown.js`: Shutdown handling

This agent-based approach ensures comprehensive automation of development tasks while maintaining high code quality, performance, and reliability standards for your FastMCP server.