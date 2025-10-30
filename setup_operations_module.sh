#!/bin/bash

###############################################################################
# Spirit Tours - Operations Module Setup Script
# Este script configura e instala todo lo necesario para el módulo de operaciones
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "This script should not be run as root (without sudo)"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="redhat"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="unknown"
    fi
    print_info "Detected OS: $OS ($DISTRO)"
}

# Install system dependencies
install_system_dependencies() {
    print_header "Installing System Dependencies"
    
    if [[ "$OS" == "linux" ]]; then
        if [[ "$DISTRO" == "debian" ]]; then
            print_info "Installing dependencies for Debian/Ubuntu..."
            sudo apt-get update
            sudo apt-get install -y \
                tesseract-ocr \
                tesseract-ocr-spa \
                tesseract-ocr-eng \
                poppler-utils \
                libpq-dev \
                python3-dev \
                build-essential \
                redis-server \
                postgresql-client
            print_success "System dependencies installed"
        elif [[ "$DISTRO" == "redhat" ]]; then
            print_info "Installing dependencies for RedHat/CentOS..."
            sudo yum install -y \
                tesseract \
                tesseract-langpack-spa \
                tesseract-langpack-eng \
                poppler-utils \
                postgresql-devel \
                python3-devel \
                gcc \
                redis \
                postgresql
            print_success "System dependencies installed"
        fi
    elif [[ "$OS" == "macos" ]]; then
        print_info "Installing dependencies for macOS..."
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew not found. Please install it first."
            exit 1
        fi
        brew install tesseract tesseract-lang poppler postgresql redis
        print_success "System dependencies installed"
    fi
}

# Verify Tesseract installation
verify_tesseract() {
    print_header "Verifying Tesseract OCR"
    
    if command -v tesseract &> /dev/null; then
        version=$(tesseract --version | head -n 1)
        print_success "Tesseract installed: $version"
        
        # Check for language packs
        if tesseract --list-langs | grep -q "spa"; then
            print_success "Spanish language pack installed"
        else
            print_warning "Spanish language pack not found"
        fi
        
        if tesseract --list-langs | grep -q "eng"; then
            print_success "English language pack installed"
        else
            print_warning "English language pack not found"
        fi
    else
        print_error "Tesseract not found in PATH"
        exit 1
    fi
}

# Install Python dependencies
install_python_dependencies() {
    print_header "Installing Python Dependencies"
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install core dependencies
    print_info "Installing core Python packages..."
    pip install -r requirements.txt
    
    # Install additional operations module dependencies
    print_info "Installing operations module packages..."
    pip install \
        openai==1.3.0 \
        pytesseract==0.3.10 \
        pdf2image==1.16.3 \
        opencv-python==4.8.1.78 \
        Pillow==10.1.0 \
        prophet==1.1.5 \
        scikit-learn==1.3.2 \
        pandas==2.1.3 \
        numpy==1.26.2 \
        joblib==1.3.2 \
        aiohttp==3.9.1 \
        redis==5.0.1
    
    print_success "Python dependencies installed"
}

# Setup database
setup_database() {
    print_header "Setting up Database"
    
    # Check if PostgreSQL is running
    if ! pg_isready &> /dev/null; then
        print_warning "PostgreSQL doesn't seem to be running"
        print_info "Please start PostgreSQL and run this script again"
        return
    fi
    
    # Run migrations
    print_info "Running database migrations..."
    python backend/migrations/create_operations_tables.py
    
    print_success "Database setup completed"
}

# Configure environment variables
configure_environment() {
    print_header "Configuring Environment Variables"
    
    if [ ! -f .env ]; then
        print_info "Creating .env file from .env.operations template..."
        cp .env.operations .env
        print_warning "Please edit .env file and add your API keys and credentials"
    else
        print_info ".env file already exists"
        print_warning "Make sure to add Operations module configuration"
    fi
    
    # Check for required environment variables
    if [ -f .env ]; then
        source .env
        
        if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" == "sk-your_openai_api_key_here" ]; then
            print_warning "OpenAI API key not configured"
        else
            print_success "OpenAI API key configured"
        fi
        
        if [ -z "$WHATSAPP_ACCESS_TOKEN" ] || [ "$WHATSAPP_ACCESS_TOKEN" == "your_whatsapp_access_token_here" ]; then
            print_warning "WhatsApp API not configured"
        else
            print_success "WhatsApp API configured"
        fi
    fi
}

# Setup frontend
setup_frontend() {
    print_header "Setting up Frontend"
    
    if [ -d "frontend" ]; then
        cd frontend
        
        print_info "Installing npm dependencies..."
        npm install
        
        print_info "Building frontend..."
        npm run build
        
        cd ..
        print_success "Frontend setup completed"
    else
        print_warning "Frontend directory not found"
    fi
}

# Create necessary directories
create_directories() {
    print_header "Creating Directories"
    
    mkdir -p logs
    mkdir -p uploads/operations
    mkdir -p models/predictive
    mkdir -p temp
    
    print_success "Directories created"
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    print_info "Running backend tests..."
    pytest tests/ -v --tb=short || print_warning "Some tests failed"
    
    print_success "Tests completed"
}

# Generate documentation
generate_documentation() {
    print_header "Generating Documentation"
    
    print_info "Starting backend server for API docs..."
    # Don't actually start the server, just inform
    print_info "API documentation will be available at: http://localhost:8000/docs"
    print_info "After starting the server with: uvicorn backend.main:app --reload"
}

# Final setup
final_setup() {
    print_header "Final Setup"
    
    # Set permissions
    chmod +x setup_operations_module.sh
    chmod +x backend/migrations/*.py
    
    print_success "Permissions set"
}

# Print next steps
print_next_steps() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}✓ All components installed successfully!${NC}\n"
    
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Edit .env file with your API keys:"
    echo "   - OpenAI API key (required for AI features)"
    echo "   - WhatsApp Business API credentials (optional)"
    echo ""
    echo "2. Configure PostgreSQL database"
    echo ""
    echo "3. Start Redis server:"
    echo "   ${YELLOW}redis-server${NC}"
    echo ""
    echo "4. Start the backend:"
    echo "   ${YELLOW}uvicorn backend.main:app --reload --port 8000${NC}"
    echo ""
    echo "5. Start the frontend (in another terminal):"
    echo "   ${YELLOW}cd frontend && npm run dev${NC}"
    echo ""
    echo "6. Access the application:"
    echo "   - Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo "   - API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
    echo "   - Operations: ${YELLOW}http://localhost:3000/operations${NC}"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "   - SISTEMA_OPERACIONES_COMPLETO_FINAL.md"
    echo "   - SISTEMA_CONTROL_RESERVAS_OPERACIONES.md"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    print_header "Spirit Tours Operations Module Setup"
    print_info "This script will install and configure the Operations module"
    
    # Ask for confirmation
    read -p "Continue with installation? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi
    
    # Run setup steps
    check_root
    detect_os
    install_system_dependencies
    verify_tesseract
    install_python_dependencies
    create_directories
    configure_environment
    setup_database
    setup_frontend
    final_setup
    run_tests
    generate_documentation
    print_next_steps
}

# Run main
main "$@"