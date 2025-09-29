#!/bin/bash

# ========================================
# YCT ND1 COMPUTER SCIENCE - SETUP SCRIPT
# ========================================
# This script helps set up the development environment

set -e  # Exit on any error

echo "🚀 YCT ND1 Computer Science Platform Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -ge 18 ]; then
            print_success "Node.js version is compatible (18+)"
        else
            print_warning "Node.js version $NODE_VERSION is not recommended. Please upgrade to 18 or higher."
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        print_status "Visit: https://nodejs.org/"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Create environment file
create_env() {
    print_status "Creating environment file..."
    if [ ! -f .env ]; then
        cp env.example .env
        print_success "Environment file created from template"
        print_warning "Please edit .env file with your actual configuration values"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Check environment file
check_env() {
    print_status "Checking environment configuration..."
    if [ -f .env ]; then
        # Check for required variables
        REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "DATABASE_URL")
        MISSING_VARS=()
        
        for var in "${REQUIRED_VARS[@]}"; do
            if ! grep -q "^${var}=" .env || grep -q "^${var}=your-" .env; then
                MISSING_VARS+=("$var")
            fi
        done
        
        if [ ${#MISSING_VARS[@]} -eq 0 ]; then
            print_success "Environment file is properly configured"
        else
            print_warning "Please configure the following variables in .env:"
            for var in "${MISSING_VARS[@]}"; do
                echo "  - $var"
            done
        fi
    else
        print_error ".env file not found. Please create it first."
        exit 1
    fi
}

# Build the application
build_app() {
    print_status "Building the application..."
    npm run build
    print_success "Application built successfully"
}

# Run type checking
type_check() {
    print_status "Running TypeScript type checking..."
    npm run check
    print_success "Type checking passed"
}

# Run linting
run_lint() {
    print_status "Running linting..."
    if command -v eslint &> /dev/null; then
        npx eslint . --ext .ts,.tsx --fix
        print_success "Linting completed"
    else
        print_warning "ESLint not found, skipping linting"
    fi
}

# Setup database
setup_database() {
    print_status "Database setup instructions:"
    echo "1. Create a Supabase project at https://supabase.com"
    echo "2. Run the SQL script from sql/main-database-setup.sql in your Supabase SQL editor"
    echo "3. For each course, create a separate Supabase project"
    echo "4. Run the SQL script from sql/course-database-setup.sql in each course database"
    echo "5. Update your .env file with the database credentials"
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "================================"
    echo ""
    echo "Next steps:"
    echo "1. Configure your .env file with Supabase credentials"
    echo "2. Set up your databases using the SQL scripts in the sql/ folder"
    echo "3. Start the development server: npm run dev"
    echo "4. Visit http://localhost:5000 to see your application"
    echo ""
    echo "For deployment:"
    echo "1. Follow the DEPLOYMENT-GUIDE.md for production setup"
    echo "2. Deploy frontend to Vercel"
    echo "3. Deploy backend to Ubuntu Cloud"
    echo ""
    echo "Documentation:"
    echo "- DEPLOYMENT-GUIDE.md - Complete deployment instructions"
    echo "- sql/ - Database setup scripts"
    echo "- client/ - Frontend React application"
    echo "- server/ - Backend Express API"
    echo ""
}

# Main setup function
main() {
    echo "Starting setup process..."
    echo ""
    
    check_node
    check_npm
    install_dependencies
    create_env
    check_env
    type_check
    run_lint
    build_app
    setup_database
    show_next_steps
}

# Run main function
main "$@"
