#!/bin/bash
# =========================================
# HenrardVisuals - Project Initialization Script
# =========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# ----------------------------------------
# Check Prerequisites
# ----------------------------------------
check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20.x or later."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v)"

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm not found. Installing..."
        npm install -g pnpm
    fi
    print_success "pnpm $(pnpm -v)"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Docker is required for running the full stack."
    else
        print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_warning "Docker Compose not found. Required for orchestration."
    else
        print_success "Docker Compose $(docker compose version | cut -d' ' -f4)"
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git."
        exit 1
    fi
    print_success "Git $(git --version | cut -d' ' -f3)"

    echo ""
}

# ----------------------------------------
# Setup Environment
# ----------------------------------------
setup_environment() {
    print_step "Setting up environment..."

    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
        
        # Generate random secrets
        POSTGRES_PWD=$(openssl rand -base64 24 2>/dev/null || head -c 24 /dev/urandom | base64)
        JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64)
        
        # Update .env with generated values
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PWD/" .env
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        else
            # Linux
            sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PWD/" .env
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        fi
        
        print_success "Generated secure secrets in .env"
    else
        print_warning ".env already exists, skipping..."
    fi

    echo ""
}

# ----------------------------------------
# Install Dependencies
# ----------------------------------------
install_dependencies() {
    print_step "Installing dependencies..."

    pnpm install

    print_success "Dependencies installed"
    echo ""
}

# ----------------------------------------
# Initialize Git
# ----------------------------------------
initialize_git() {
    print_step "Initializing Git repository..."

    if [ -d .git ]; then
        print_warning "Git repository already initialized"
    else
        git init
        print_success "Git repository initialized"
    fi

    # Add remote if not exists
    if ! git remote | grep -q "origin"; then
        git remote add origin https://github.com/K-Schmitt/HenrardVisuals.git
        print_success "Added remote: origin -> https://github.com/K-Schmitt/HenrardVisuals.git"
    else
        print_warning "Remote 'origin' already exists"
    fi

    echo ""
}

# ----------------------------------------
# Create Initial Commit
# ----------------------------------------
create_initial_commit() {
    print_step "Preparing initial commit..."

    # Check if there are any commits
    if git rev-parse HEAD &> /dev/null; then
        print_warning "Repository already has commits, skipping initial commit..."
    else
        git add .
        git commit -m "feat: initial project setup

- React 18 + TypeScript + Vite frontend
- Self-hosted Supabase stack (auth, storage, REST API)
- Docker Compose configuration for dev and production
- Tailwind CSS custom design system
- Professional documentation in /docs"

        print_success "Initial commit created"
    fi

    echo ""
}

# ----------------------------------------
# Create Docker Volumes
# ----------------------------------------
create_volumes() {
    print_step "Creating Docker volume directories..."

    mkdir -p volumes/db/data
    mkdir -p volumes/storage
    
    # Set permissions for PostgreSQL
    chmod 755 volumes/db/data
    
    print_success "Volume directories created"
    echo ""
}

# ----------------------------------------
# Verify Setup
# ----------------------------------------
verify_setup() {
    print_step "Verifying setup..."

    # Check TypeScript
    pnpm type-check && print_success "TypeScript check passed" || print_error "TypeScript errors found"

    echo ""
}

# ----------------------------------------
# Print Summary
# ----------------------------------------
print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   HenrardVisuals Setup Complete! 🎉   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Review and update .env with your settings"
    echo ""
    echo "  2. Start the development environment:"
    echo "     ${BLUE}docker compose -f docker-compose.dev.yml up -d${NC}"
    echo ""
    echo "  3. Run type checks and lint:"
    echo "     ${BLUE}pnpm check${NC}"
    echo ""
    echo "  4. Access the application:"
    echo "     Frontend:        http://localhost:5173"
    echo "     Supabase Studio: http://localhost:8080"
    echo "     API Gateway:     http://localhost:8000"
    echo ""
    echo "  5. Push to GitHub:"
    echo "     ${BLUE}git push -u origin main${NC}"
    echo ""
    echo "Documentation:"
    echo "  - Architecture: docs/ARCHITECTURE.md"
    echo "  - Setup Guide:  docs/SETUP.md"
    echo "  - Deployment:   docs/DEPLOY.md"
    echo ""
}

# ----------------------------------------
# Main
# ----------------------------------------
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  HenrardVisuals Project Initialization ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    setup_environment
    install_dependencies
    create_volumes
    initialize_git
    create_initial_commit
    verify_setup
    print_summary
}

# Run main function
main "$@"
