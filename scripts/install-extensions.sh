#!/bin/bash

# Essential Extensions Installation Script for Cursor
# This script installs the most critical extensions for maximum productivity

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Installing Essential Cursor Extensions...${NC}"
echo ""

# Essential extensions (most critical first)
ESSENTIAL_EXTENSIONS=(
    "dbaeumer.vscode-eslint"              # ESLint
    "esbenp.prettier-vscode"              # Prettier
    "usernamehw.errorlens"                # Error Lens
    "eamodio.gitlens"                     # GitLens
    "ms-vscode.vscode-typescript-next"    # TypeScript
    "streetsidesoftware.code-spell-checker" # Spell Checker
    "aaron-bond.better-comments"          # Better Comments
    "christian-kohler.path-intellisense"  # Path Intellisense
    "formulahendry.auto-rename-tag"       # Auto Rename Tag
    "pkief.material-icon-theme"           # Material Icons
)

# AI & Productivity extensions
AI_EXTENSIONS=(
    "github.copilot"                      # GitHub Copilot
    "github.copilot-chat"                 # Copilot Chat
    "continue.continue"                   # Continue AI
)

# Development tools
DEV_EXTENSIONS=(
    "vitest.explorer"                     # Vitest
    "humao.rest-client"                   # REST Client
    "ms-azuretools.vscode-docker"         # Docker
    "yzhang.markdown-all-in-one"          # Markdown
    "bradlc.vscode-tailwindcss"           # Tailwind CSS
)

install_extension() {
    local ext_id=$1
    local ext_name=$2
    
    echo -e "${YELLOW}📦 Installing ${ext_name}...${NC}"
    
    # Try to install with cursor command
    if command -v cursor &> /dev/null; then
        cursor --install-extension "$ext_id" &> /dev/null || {
            echo -e "${YELLOW}⚠️  Failed to install ${ext_name} - may already be installed${NC}"
            return 1
        }
    # Fallback to code command
    elif command -v code &> /dev/null; then
        code --install-extension "$ext_id" &> /dev/null || {
            echo -e "${YELLOW}⚠️  Failed to install ${ext_name} - may already be installed${NC}"
            return 1
        }
    else
        echo -e "${YELLOW}⚠️  Neither 'cursor' nor 'code' command found. Install manually.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ ${ext_name} installed${NC}"
}

# Install essential extensions
echo -e "${BLUE}Installing Essential Extensions:${NC}"
for ext in "${ESSENTIAL_EXTENSIONS[@]}"; do
    case $ext in
        "dbaeumer.vscode-eslint") install_extension "$ext" "ESLint" ;;
        "esbenp.prettier-vscode") install_extension "$ext" "Prettier" ;;
        "usernamehw.errorlens") install_extension "$ext" "Error Lens" ;;
        "eamodio.gitlens") install_extension "$ext" "GitLens" ;;
        "ms-vscode.vscode-typescript-next") install_extension "$ext" "TypeScript" ;;
        "streetsidesoftware.code-spell-checker") install_extension "$ext" "Spell Checker" ;;
        "aaron-bond.better-comments") install_extension "$ext" "Better Comments" ;;
        "christian-kohler.path-intellisense") install_extension "$ext" "Path Intellisense" ;;
        "formulahendry.auto-rename-tag") install_extension "$ext" "Auto Rename Tag" ;;
        "pkief.material-icon-theme") install_extension "$ext" "Material Icons" ;;
    esac
done

echo ""
echo -e "${BLUE}Installing AI Extensions:${NC}"
for ext in "${AI_EXTENSIONS[@]}"; do
    case $ext in
        "github.copilot") install_extension "$ext" "GitHub Copilot" ;;
        "github.copilot-chat") install_extension "$ext" "Copilot Chat" ;;
        "continue.continue") install_extension "$ext" "Continue AI" ;;
    esac
done

echo ""
echo -e "${BLUE}Installing Development Tools:${NC}"
for ext in "${DEV_EXTENSIONS[@]}"; do
    case $ext in
        "vitest.explorer") install_extension "$ext" "Vitest Explorer" ;;
        "humao.rest-client") install_extension "$ext" "REST Client" ;;
        "ms-azuretools.vscode-docker") install_extension "$ext" "Docker" ;;
        "yzhang.markdown-all-in-one") install_extension "$ext" "Markdown All-in-One" ;;
        "bradlc.vscode-tailwindcss") install_extension "$ext" "Tailwind CSS" ;;
    esac
done

echo ""
echo -e "${GREEN}🎉 Extension installation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Restart Cursor to activate all extensions"
echo "2. Configure any extensions that require setup"
echo "3. Check Extensions panel (Ctrl+Shift+X) for any manual installations needed"
echo ""
echo -e "${YELLOW}Note: Some extensions may require additional setup or authentication${NC}"