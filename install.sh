#!/bin/bash

# Teleport Installation Script
# This script automates the installation of Teleport Caddy Controller

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  Teleport Caddy Controller Installer"
    echo "=================================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_dependencies() {
    print_step "Checking dependencies"
    
    # Check for Go
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go 1.21+ first:"
        echo "  https://golang.org/doc/install"
        exit 1
    fi
    
    # Check Go version
    GO_VERSION=$(go version | grep -oP 'go\K[0-9]+\.[0-9]+')
    if [[ $(echo "$GO_VERSION < 1.21" | bc -l) -eq 1 ]]; then
        print_error "Go version $GO_VERSION is too old. Please install Go 1.21+"
        exit 1
    fi
    
    print_info "Go version $GO_VERSION found ✓"
    
    # Check for make
    if ! command -v make &> /dev/null; then
        print_error "Make is not installed. Please install build-essential:"
        echo "  Ubuntu/Debian: sudo apt install build-essential"
        echo "  CentOS/RHEL:   sudo dnf groupinstall 'Development Tools'"
        exit 1
    fi
    
    print_info "Make found ✓"
    
    # Check for systemctl
    if ! command -v systemctl &> /dev/null; then
        print_error "systemctl not found. This script requires systemd."
        exit 1
    fi
    
    print_info "systemd found ✓"
}

install_teleport() {
    print_step "Installing Teleport"
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    print_info "Downloading Teleport source..."
    
    # Clone or download source (adjust URL as needed)
    if command -v git &> /dev/null; then
        git clone https://github.com/ccheshirecat/teleport.git .
    else
        print_error "Git not found. Please install git or download source manually."
        exit 1
    fi
    
    print_info "Building and installing Teleport..."
    
    # Build and install using Makefile
    make deploy
    
    print_info "Cleaning up..."
    cd /
    rm -rf "$TEMP_DIR"
}

configure_firewall() {
    print_step "Configuring firewall"
    
    if command -v ufw &> /dev/null; then
        print_info "Configuring UFW firewall..."
        
        # Allow Teleport API from local network
        ufw allow 3333/tcp
        
        print_warning "Firewall rule added for port 3333"
        print_warning "Consider restricting access to specific networks:"
        echo "  sudo ufw delete allow 3333/tcp"
        echo "  sudo ufw allow from 10.0.1.0/24 to any port 3333"
        
    elif command -v firewall-cmd &> /dev/null; then
        print_info "Configuring firewalld..."
        
        # Allow Teleport API
        firewall-cmd --permanent --add-port=3333/tcp
        firewall-cmd --reload
        
        print_warning "Firewall rule added for port 3333"
        print_warning "Consider restricting access to specific networks"
        
    else
        print_warning "No supported firewall found (ufw/firewalld)"
        print_warning "Please manually configure firewall to allow port 3333"
    fi
}

show_next_steps() {
    print_step "Installation complete!"
    
    echo ""
    echo -e "${GREEN}✅ Teleport has been installed successfully!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo ""
    echo "1. 📝 Review configuration:"
    echo "   sudo nano /opt/teleport/config.yaml"
    echo ""
    echo "2. 🔧 Set up WireGuard network:"
    echo "   See WIREGUARD-SETUP.md for detailed instructions"
    echo ""
    echo "3. 🚀 Access Teleport:"
    echo "   Web UI: http://localhost:3333 (after WireGuard setup)"
    echo "   API: http://localhost:3333/api/v1/status"
    echo ""
    echo "4. 📊 Monitor service:"
    echo "   sudo make status-service   # Check status"
    echo "   sudo make logs-service     # View logs"
    echo ""
    echo "5. 🔧 Manage service:"
    echo "   sudo make start-service    # Start"
    echo "   sudo make stop-service     # Stop"
    echo "   sudo make restart-service  # Restart"
    echo ""
    echo "📚 Documentation:"
    echo "   README.md           - General information"
    echo "   DEPLOYMENT.md       - Production deployment"
    echo "   WIREGUARD-SETUP.md  - Network setup"
    echo "   ARCHITECTURE.md     - System architecture"
    echo ""
    
    # Show current status
    echo "🔍 Current status:"
    systemctl status teleport --no-pager -l || true
}

main() {
    print_header
    
    check_root
    check_dependencies
    install_teleport
    configure_firewall
    show_next_steps
    
    echo ""
    echo -e "${GREEN}🎉 Teleport installation completed successfully!${NC}"
}

# Handle script interruption
trap 'echo -e "\n${RED}Installation interrupted${NC}"; exit 1' INT TERM

main "$@"
