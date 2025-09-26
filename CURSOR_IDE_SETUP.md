# Cursor IDE Setup Guide

## 🚀 **Complete Cursor IDE Environment Setup**

This guide provides comprehensive instructions for setting up Cursor IDE for optimal development experience with the Unified EasyPost-Veeqo MCP Server.

## 📋 **Prerequisites**

- **Cursor IDE**: Latest version installed
- **Node.js**: >=20.0.0 (specified in `.nvmrc`)
- **pnpm**: >=8.0.0 (recommended package manager)
- **Git**: Latest version with Git hooks enabled

## 🛠️ **Quick Setup**

### 1. **Automated Setup**

```bash
# Run the automated setup script
./scripts/setup-cursor-environment.sh
```

### 2. **Manual Setup**

```bash
# Install dependencies
pnpm install

# Build project
pnpm run build

# Run quality checks
pnpm run quality:check

# Run tests
pnpm test

# Validate structure
pnpm run validate:structure
```

## 🎯 **Cursor IDE Configuration**

### **Workspace Settings**

The project includes optimized Cursor IDE settings in:

- `unified-easyship-veeqo-mcp.code-workspace` - Main workspace configuration
- `.cursor/settings.json` - Cursor-specific settings
- `.cursor/extensions.json` - Recommended extensions
- `.cursor/mcp.json` - MCP server configuration

### **Key Features Enabled**

- ✅ **Auto-formatting** on save with Prettier
- ✅ **ESLint integration** with auto-fix
- ✅ **TypeScript support** with advanced features
- ✅ **Git integration** with GitLens
- ✅ **MCP server integration** for AI assistance
- ✅ **Debug configurations** for server and tests
- ✅ **Task automation** for common operations
- ✅ **Error highlighting** with Error Lens
- ✅ **Code suggestions** and IntelliSense
- ✅ **Path intellisense** for imports

## 🔧 **Environment Configuration**

### **Environment Variables**

Create `.env` file with your API keys:

```bash
# Copy from example
cp .env.example .env

# Edit with your keys
EASYPOST_API_KEY=your_easypost_key_here
VEEQO_API_KEY=your_veeqo_key_here
```

### **Development Modes**

```bash
# Development with real API keys
pnpm run dev

# Development with mock API keys (for testing)
pnpm run dev:fastmcp
```

## 📦 **Recommended Extensions**

### **Core Development**

- **TypeScript and JavaScript Language Features** - Enhanced TS/JS support
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **GitLens** - Enhanced Git capabilities

### **Productivity**

- **Error Lens** - Inline error highlighting
- **Path Intellisense** - Auto-complete for file paths
- **Better Comments** - Enhanced comment highlighting
- **TODO Highlight** - Highlight TODO/FIXME comments
- **Auto Rename Tag** - Auto-rename paired HTML/JSX tags

### **Testing & Quality**

- **Vitest** - Test runner integration
- **Code Spell Checker** - Spell checking for code
- **Import Cost** - Bundle size analysis

### **API & Documentation**

- **REST Client** - Test HTTP requests
- **Markdown All in One** - Enhanced markdown support
- **Docker** - Container management

### **AI & MCP**

- **Cursor MCP** - MCP server integration
- **GitHub Copilot** - AI code suggestions
- **GitHub Copilot Chat** - AI chat assistance

## 🎮 **Available Tasks**

### **Development Tasks**

- `🚀 Start Development Server` - Start dev server with hot reload
- `🏗️ Build Project` - Build for production
- `🧪 Run Tests` - Run all tests
- `🧪 Run Tests (Watch)` - Run tests in watch mode

### **Quality Tasks**

- `🔍 Lint Code` - Check code quality
- `🔧 Fix Lint Issues` - Auto-fix linting issues
- `🎨 Format Code` - Format code with Prettier
- `✅ Quality Check` - Run comprehensive quality checks
- `🔍 Type Check` - TypeScript type checking
- `📊 Validate Structure` - Validate project structure

### **Deployment Tasks**

- `🐳 Docker Build` - Build Docker container
- `🚀 Deploy to Railway` - Deploy to Railway platform

## 🐛 **Debug Configurations**

### **Available Debug Configs**

1. **🐛 Debug MCP Server** - Debug main server with real API keys
2. **🐛 Debug MCP Server (FastMCP)** - Debug with mock API keys
3. **🧪 Debug Tests** - Debug all tests
4. **🧪 Debug Current Test** - Debug currently open test file

### **Debug Features**

- ✅ **Source maps** enabled
- ✅ **Breakpoint support** for TypeScript
- ✅ **Environment variables** loaded from `.env`
- ✅ **Console integration** with Cursor terminal
- ✅ **Restart on change** for development

## 🤖 **AI & MCP Integration**

### **Cursor AI Features**

- **Claude 3.5 Sonnet** - Primary AI model
- **Context awareness** - Project-specific suggestions
- **Code explanations** - Detailed code analysis
- **Test generation** - Automated test creation
- **Debug assistance** - AI-powered debugging help
- **Performance optimization** - Code optimization suggestions
- **Security analysis** - Security vulnerability detection

### **MCP Server Integration**

- **Auto-start** - MCP server starts automatically
- **Health checks** - Monitor server status
- **Performance monitoring** - Track server performance
- **Auto-refresh** - Restart on code changes
- **Tool integration** - Access to 46 MCP tools
- **Prompt integration** - AI-powered prompts

## 📊 **Performance Optimization**

### **Editor Performance**

- **Large file optimization** - Handle files up to 4GB
- **Tokenization limits** - Optimized for 20k+ line files
- **Search optimization** - Exclude unnecessary directories
- **File watching** - Optimized file change detection

### **Development Performance**

- **Incremental compilation** - Faster TypeScript builds
- **Hot reload** - Instant code changes
- **Parallel testing** - Faster test execution
- **Cached dependencies** - Faster installs

## 🔒 **Security & Trust**

### **Workspace Trust**

- **Trusted workspace** - Secure development environment
- **Untrusted file prompts** - Security for external files
- **Git integration** - Secure version control

### **Environment Security**

- **Environment variables** - Secure API key handling
- **Git hooks** - Pre-commit security checks
- **Dependency scanning** - Security vulnerability detection

## 🚀 **Getting Started**

### **1. Open Project**

```bash
# Open in Cursor IDE
cursor unified-easyship-veeqo-mcp.code-workspace
```

### **2. Install Extensions**

Cursor IDE will prompt to install recommended extensions. Click "Install All" to install all recommended extensions.

### **3. Configure Environment**

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### **4. Start Development**

```bash
# Start development server
pnpm run dev

# Or use Cursor IDE task
# Press Ctrl+Shift+P -> "Tasks: Run Task" -> "🚀 Start Development Server"
```

### **5. Test MCP Integration**

```bash
# Test with mock API keys
pnpm run dev:fastmcp

# Or use debug configuration
# Press F5 -> Select "🐛 Debug MCP Server (FastMCP)"
```

## 🎯 **Best Practices**

### **Development Workflow**

1. **Open workspace** - Use the `.code-workspace` file
2. **Install extensions** - Install all recommended extensions
3. **Configure environment** - Set up API keys in `.env`
4. **Run quality checks** - Ensure code quality before committing
5. **Use debug mode** - Debug issues with integrated debugger
6. **Leverage AI** - Use Cursor AI for code assistance

### **Code Quality**

- **Format on save** - Automatic code formatting
- **Lint on save** - Automatic linting and fixes
- **Type checking** - Real-time TypeScript validation
- **Test coverage** - Maintain high test coverage
- **Git hooks** - Pre-commit quality checks

### **Performance**

- **Use tasks** - Leverage Cursor IDE tasks for common operations
- **Debug efficiently** - Use debug configurations for troubleshooting
- **Monitor performance** - Use built-in performance monitoring
- **Optimize imports** - Use path intellisense for clean imports

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Extensions Not Working**

```bash
# Reload Cursor IDE
Ctrl+Shift+P -> "Developer: Reload Window"
```

#### **TypeScript Errors**

```bash
# Restart TypeScript server
Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

#### **ESLint Issues**

```bash
# Restart ESLint server
Ctrl+Shift+P -> "ESLint: Restart ESLint Server"
```

#### **MCP Server Not Starting**

```bash
# Check environment variables
cat .env

# Test server manually
pnpm run dev:fastmcp
```

### **Performance Issues**

- **Disable unused extensions** - Remove unnecessary extensions
- **Exclude large directories** - Update `.cursorignore`
- **Restart Cursor IDE** - Restart if performance degrades
- **Check memory usage** - Monitor system resources

## 📚 **Additional Resources**

### **Documentation**

- [Cursor IDE Documentation](https://cursor.sh/docs)
- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [FastMCP Documentation](https://glama.ai/mcp)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

### **Project Documentation**

- `README.md` - Project overview
- `DEVELOPMENT_WORKFLOW.md` - Development guidelines
- `PROJECT_STRUCTURE.md` - Project structure standards
- `API_DOCUMENTATION.md` - API documentation

### **Support**

- **GitHub Issues** - Report bugs and request features
- **Discord Community** - Get help from the community
- **Documentation** - Comprehensive project documentation

## 🎉 **Success!**

Your Cursor IDE environment is now fully configured for optimal development with the Unified EasyPost-Veeqo MCP Server. Enjoy the enhanced development experience with AI assistance, automated quality checks, and seamless MCP integration!

**Happy coding! 🚀**
