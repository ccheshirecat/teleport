#!/bin/bash

# Secure Network Setup for Teleport
# Configures Teleport to bind to specific internal IP

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
    echo "  Teleport Secure Network Configuration"
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

get_network_info() {
    print_step "Detecting network configuration"
    
    # Get available IP addresses
    echo "Available network interfaces:"
    ip addr show | grep -E "inet [0-9]" | grep -v "127.0.0.1" | awk '{print "  " $2}' | sed 's/\/.*$//'
    echo ""
    
    # Default suggestion
    SUGGESTED_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K[0-9.]+' | head -1)
    if [[ -n "$SUGGESTED_IP" ]]; then
        print_info "Suggested IP (primary interface): $SUGGESTED_IP"
    fi
    echo ""
}

configure_teleport() {
    print_step "Configuring Teleport network settings"
    
    # Get user input
    echo -e "${YELLOW}Enter the IP address to bind Teleport to:${NC}"
    echo "Examples:"
    echo "  10.0.0.10    - Specific internal IP"
    echo "  192.168.1.10 - Local network IP"
    echo "  (empty)      - All interfaces (less secure)"
    echo ""
    read -p "IP address: " BIND_IP
    
    if [[ -z "$BIND_IP" ]]; then
        print_warning "No IP specified - will bind to all interfaces"
        BIND_IP=""
    else
        # Validate IP format
        if [[ ! $BIND_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            print_error "Invalid IP address format"
            exit 1
        fi
        
        # Check if IP exists on system
        if ! ip addr show | grep -q "$BIND_IP"; then
            print_warning "IP $BIND_IP not found on this system"
            echo "Available IPs:"
            ip addr show | grep -E "inet [0-9]" | awk '{print "  " $2}' | sed 's/\/.*$//'
            echo ""
            read -p "Continue anyway? [y/N]: " confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Create configuration
    CONFIG_FILE="/opt/teleport/config.yaml"
    
    if [[ ! -d "/opt/teleport" ]]; then
        print_error "Teleport not installed. Run 'sudo make deploy' first."
        exit 1
    fi
    
    print_info "Creating configuration at $CONFIG_FILE"
    
    cat > "$CONFIG_FILE" << EOF
server:
  host: "$BIND_IP"
  port: 3333
  mode: production

database:
  path: /opt/teleport/data/teleport.db

logging:
  level: info
  format: json
EOF
    
    # Set proper ownership
    chown teleport:teleport "$CONFIG_FILE"
    chmod 644 "$CONFIG_FILE"
    
    print_info "Configuration created successfully"
}

configure_firewall() {
    print_step "Configuring firewall rules"
    
    if [[ -z "$BIND_IP" ]]; then
        print_warning "Skipping firewall configuration (no specific IP)"
        return
    fi
    
    if command -v ufw &> /dev/null; then
        print_info "Configuring UFW firewall"
        
        # Remove any existing rules for port 3333
        ufw --force delete allow 3333/tcp 2>/dev/null || true
        
        # Allow access from the same subnet
        SUBNET=$(echo "$BIND_IP" | sed 's/\.[0-9]*$/.0\/24/')
        ufw allow from "$SUBNET" to any port 3333
        
        # Allow localhost access
        ufw allow from 127.0.0.1 to any port 3333
        
        print_info "Firewall rules added:"
        print_info "  - Allow from subnet: $SUBNET"
        print_info "  - Allow from localhost: 127.0.0.1"
        
    elif command -v firewall-cmd &> /dev/null; then
        print_info "Configuring firewalld"
        
        # Remove existing rules
        firewall-cmd --permanent --remove-port=3333/tcp 2>/dev/null || true
        
        # Add subnet rule
        SUBNET=$(echo "$BIND_IP" | sed 's/\.[0-9]*$/.0\/24/')
        firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$SUBNET\" port protocol=\"tcp\" port=\"3333\" accept"
        firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"127.0.0.1\" port protocol=\"tcp\" port=\"3333\" accept"
        firewall-cmd --reload
        
        print_info "Firewall rules added for subnet: $SUBNET"
        
    else
        print_warning "No supported firewall found (ufw/firewalld)"
        print_warning "Please manually configure firewall to restrict port 3333"
    fi
}

restart_teleport() {
    print_step "Restarting Teleport service"
    
    if systemctl is-active --quiet teleport; then
        systemctl restart teleport
        sleep 2
        
        if systemctl is-active --quiet teleport; then
            print_info "Teleport service restarted successfully"
        else
            print_error "Failed to restart Teleport service"
            systemctl status teleport
            exit 1
        fi
    else
        print_warning "Teleport service not running. Starting..."
        systemctl start teleport
        sleep 2
        
        if systemctl is-active --quiet teleport; then
            print_info "Teleport service started successfully"
        else
            print_error "Failed to start Teleport service"
            systemctl status teleport
            exit 1
        fi
    fi
}

verify_configuration() {
    print_step "Verifying configuration"
    
    # Check what port is listening
    sleep 3
    LISTENING=$(ss -tlnp | grep :3333 || true)
    
    if [[ -n "$LISTENING" ]]; then
        print_info "Teleport is listening on:"
        echo "$LISTENING"
        
        if [[ -n "$BIND_IP" ]]; then
            if echo "$LISTENING" | grep -q "$BIND_IP:3333"; then
                print_info "✅ Successfully bound to $BIND_IP:3333"
            else
                print_warning "⚠️  Not bound to expected IP $BIND_IP"
            fi
        fi
    else
        print_error "❌ Teleport is not listening on port 3333"
        exit 1
    fi
    
    # Test API endpoint
    if [[ -n "$BIND_IP" ]]; then
        TEST_URL="http://$BIND_IP:3333/health"
    else
        TEST_URL="http://localhost:3333/health"
    fi
    
    print_info "Testing API endpoint: $TEST_URL"
    
    if curl -s --connect-timeout 5 "$TEST_URL" | grep -q "ok"; then
        print_info "✅ API endpoint responding correctly"
    else
        print_warning "⚠️  API endpoint not responding"
    fi
}

show_access_info() {
    print_step "Access Information"
    
    echo ""
    echo -e "${GREEN}✅ Teleport is now configured for secure network access!${NC}"
    echo ""
    
    if [[ -n "$BIND_IP" ]]; then
        echo "🔒 Teleport API bound to: $BIND_IP:3333"
        echo ""
        echo "📋 SSH Tunnel Command (from your local machine):"
        echo "   ssh -L 3333:$BIND_IP:3333 user@$(hostname -f)"
        echo ""
        echo "🌐 Access URLs (via SSH tunnel):"
        echo "   API: http://localhost:3333"
        echo "   Health: http://localhost:3333/health"
        echo "   Status: http://localhost:3333/api/v1/status"
    else
        echo "🔒 Teleport API bound to: all interfaces:3333"
        echo ""
        echo "🌐 Access URLs:"
        echo "   API: http://localhost:3333"
        echo "   Health: http://localhost:3333/health"
        echo "   Status: http://localhost:3333/api/v1/status"
    fi
    
    echo ""
    echo "🔧 Service Management:"
    echo "   Status: sudo systemctl status teleport"
    echo "   Logs:   sudo journalctl -u teleport -f"
    echo "   Restart: sudo systemctl restart teleport"
    echo ""
    echo "📚 Next Steps:"
    echo "   1. Set up WireGuard network (see WIREGUARD-SETUP.md)"
    echo "   2. Configure web interface (see NETWORK-CONFIG.md)"
    echo "   3. Add Caddy slaves to your fleet"
}

main() {
    print_header
    
    check_root
    get_network_info
    configure_teleport
    configure_firewall
    restart_teleport
    verify_configuration
    show_access_info
    
    echo ""
    echo -e "${GREEN}🎉 Secure network configuration completed!${NC}"
}

main "$@"
