#!/bin/bash

# Dental Clinic SaaS - Startup Script
# This script handles all setup and starts the application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
echo ""
echo "=================================="
echo "  Dental Clinic SaaS Setup"
echo "=================================="
echo ""

# Step 1: Check Node.js installation
log_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi
log_success "Node.js $(node -v) detected"

# Step 2: Check PostgreSQL installation
log_info "Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    log_warning "PostgreSQL CLI (psql) not found in PATH"
    log_info "Please ensure PostgreSQL is installed and running"
else
    log_success "PostgreSQL detected"
fi

# Step 3: Kill processes on port 3000
log_info "Checking for processes on port 3000..."
PORT=3000
PIDS=$(lsof -ti:$PORT 2>/dev/null || true)

if [ ! -z "$PIDS" ]; then
    log_warning "Found process(es) running on port $PORT"
    log_info "Killing process(es): $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
    log_success "Cleared port $PORT"
else
    log_success "Port $PORT is available"
fi

# Step 4: Check if .env file exists
log_info "Checking environment configuration..."
if [ ! -f .env ]; then
    log_warning ".env file not found"
    log_info "Creating .env from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        log_success "Created .env file"
        log_warning "Please update .env with your database credentials before continuing"
        log_info "Press Enter when ready to continue or Ctrl+C to exit..."
        read
    else
        log_error ".env.example not found. Cannot proceed."
        exit 1
    fi
else
    log_success ".env file exists"
fi

# Step 5: Install dependencies
log_info "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    log_success "Dependencies installed"
else
    log_info "Dependencies already installed (run 'rm -rf node_modules' to reinstall)"
fi

# Step 6: Generate Prisma Client
log_info "Generating Prisma Client..."
npm run db:generate
log_success "Prisma Client generated"

# Step 7: Database setup
log_info "Setting up database..."

# Check if database exists
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')
if [ -z "$DB_URL" ]; then
    log_error "DATABASE_URL not found in .env file"
    exit 1
fi

# Extract database name from URL
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
log_info "Database name: $DB_NAME"

# Option to reset database
echo ""
read -p "Do you want to reset the database? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Resetting database..."

    # Try to drop and create database (local PostgreSQL only)
    if command -v psql &> /dev/null; then
        log_info "Dropping database if exists..."
        dropdb $DB_NAME 2>/dev/null || true

        log_info "Creating database..."
        createdb $DB_NAME || log_warning "Database might already exist or you don't have permissions"
    fi

    log_info "Pushing schema to database..."
    npm run db:push

    log_info "Seeding database with sample data..."
    npm run db:seed

    log_success "Database reset complete"
else
    log_info "Checking if schema needs to be pushed..."
    npm run db:push || {
        log_error "Failed to push schema. Your database might need to be set up."
        exit 1
    }
    log_success "Database schema is up to date"
fi

# Step 8: Build the application (optional for dev)
read -p "Do you want to build for production? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Building application for production..."
    npm run build
    log_success "Build complete"

    log_info "Starting production server..."
    npm start
else
    # Step 9: Start development server
    log_info "Starting development server..."
    log_success "Application will be available at http://localhost:3000"
    echo ""
    echo "=================================="
    echo "  Demo Credentials"
    echo "=================================="
    echo ""
    echo "Admin:        admin@dentalclinic.com / password123"
    echo "Dentist:      dr.smith@dentalclinic.com / password123"
    echo "Receptionist: receptionist@dentalclinic.com / password123"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "=================================="
    echo ""

    npm run dev
fi
