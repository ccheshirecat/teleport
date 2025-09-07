#!/bin/bash

# Teleport WireGuard Setup Script
# This script helps set up WireGuard for Teleport management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WG_DIR="/etc/wireguard"
WG_INTERFACE="wg0"
WG_PORT="51820"
NETWORK_BASE="10.0.1"

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  Teleport WireGuard Setup Script"
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

check_wireguard() {
    if ! command -v wg &> /dev/null; then
        print_error "WireGuard is not installed. Please install it first:"
        echo "  Ubuntu/Debian: sudo apt install wireguard"
        echo "  CentOS/RHEL:   sudo dnf install wireguard-tools"
        echo "  Alpine:        sudo apk add wireguard-tools"
        exit 1
    fi
}

generate_keys() {
    local key_name=$1
    local private_key="${WG_DIR}/${key_name}-private.key"
    local public_key="${WG_DIR}/${key_name}-public.key"
    
    print_step "Generating keys for ${key_name}"
    
    # Generate private key
    wg genkey > "${private_key}"
    chmod 600 "${private_key}"
    
    # Generate public key
    wg pubkey < "${private_key}" > "${public_key}"
    chmod 644 "${public_key}"
    
    print_info "Private key: ${private_key}"
    print_info "Public key:  ${public_key}"
    
    echo "Private Key: $(cat ${private_key})"
    echo "Public Key:  $(cat ${public_key})"
    echo ""
}

setup_management_server() {
    print_step "Setting up Management Server configuration"
    
    # Create WireGuard directory
    mkdir -p "${WG_DIR}"
    cd "${WG_DIR}"
    
    # Generate management server keys
    generate_keys "management"
    
    # Get server details
    echo -e "${YELLOW}Please provide the following information:${NC}"
    read -p "Management server public IP: " MGMT_PUBLIC_IP
    read -p "Number of edge nodes: " NUM_EDGES
    
    # Create configuration file
    cat > "${WG_DIR}/${WG_INTERFACE}.conf" << EOF
[Interface]
# Management server configuration
PrivateKey = $(cat management-private.key)
Address = ${NETWORK_BASE}.1/24
ListenPort = ${WG_PORT}
SaveConfig = false

# Enable IP forwarding
PostUp = echo 1 > /proc/sys/net/ipv4/ip_forward
PostUp = iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i ${WG_INTERFACE} -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

EOF

    # Add peer sections for edge nodes
    for ((i=1; i<=NUM_EDGES; i++)); do
        edge_ip=$((i + 9))  # Start from .10
        cat >> "${WG_DIR}/${WG_INTERFACE}.conf" << EOF
# Edge Node $i
[Peer]
PublicKey = <EDGE_NODE_${i}_PUBLIC_KEY>
AllowedIPs = ${NETWORK_BASE}.${edge_ip}/32
Endpoint = <EDGE_NODE_${i}_PUBLIC_IP>:${WG_PORT}
PersistentKeepalive = 25

EOF
    done
    
    print_info "Management server configuration created at ${WG_DIR}/${WG_INTERFACE}.conf"
    print_warning "You need to manually update the <EDGE_NODE_X_PUBLIC_KEY> and <EDGE_NODE_X_PUBLIC_IP> placeholders"
    
    # Create edge node configuration templates
    for ((i=1; i<=NUM_EDGES; i++)); do
        edge_ip=$((i + 9))
        cat > "${WG_DIR}/edge-node-${i}.conf" << EOF
[Interface]
# Edge node $i configuration
PrivateKey = <EDGE_NODE_${i}_PRIVATE_KEY>
Address = ${NETWORK_BASE}.${edge_ip}/24
DNS = 8.8.8.8

[Peer]
# Management server
PublicKey = $(cat management-public.key)
AllowedIPs = ${NETWORK_BASE}.0/24
Endpoint = ${MGMT_PUBLIC_IP}:${WG_PORT}
PersistentKeepalive = 25
EOF
        print_info "Edge node $i template created at ${WG_DIR}/edge-node-${i}.conf"
    done
}

setup_edge_node() {
    print_step "Setting up Edge Node configuration"
    
    # Create WireGuard directory
    mkdir -p "${WG_DIR}"
    cd "${WG_DIR}"
    
    # Generate edge node keys
    generate_keys "edge"
    
    # Get configuration details
    echo -e "${YELLOW}Please provide the following information:${NC}"
    read -p "Management server public IP: " MGMT_PUBLIC_IP
    read -p "Management server public key: " MGMT_PUBLIC_KEY
    read -p "This edge node's WireGuard IP (e.g., ${NETWORK_BASE}.10): " EDGE_IP
    
    # Create configuration file
    cat > "${WG_DIR}/${WG_INTERFACE}.conf" << EOF
[Interface]
# Edge node configuration
PrivateKey = $(cat edge-private.key)
Address = ${EDGE_IP}/24
DNS = 8.8.8.8

[Peer]
# Management server
PublicKey = ${MGMT_PUBLIC_KEY}
AllowedIPs = ${NETWORK_BASE}.0/24
Endpoint = ${MGMT_PUBLIC_IP}:${WG_PORT}
PersistentKeepalive = 25
EOF
    
    print_info "Edge node configuration created at ${WG_DIR}/${WG_INTERFACE}.conf"
}

configure_firewall() {
    print_step "Configuring firewall rules"
    
    if command -v ufw &> /dev/null; then
        print_info "Configuring UFW firewall"
        
        # Allow WireGuard port
        ufw allow ${WG_PORT}/udp
        
        if [[ "$1" == "management" ]]; then
            # Management server rules
            ufw allow from ${NETWORK_BASE}.0/24 to any port 3333
            print_info "Allowed Teleport API access from WireGuard network"
        else
            # Edge node rules
            ufw allow from ${NETWORK_BASE}.1 to any port 2019
            ufw allow 80/tcp
            ufw allow 443/tcp
            print_info "Allowed Caddy admin API and HTTP/HTTPS traffic"
        fi
        
        print_warning "Firewall rules added. Enable with: sudo ufw enable"
    else
        print_warning "UFW not found. Please configure firewall manually."
    fi
}

start_wireguard() {
    print_step "Starting WireGuard"
    
    # Enable and start WireGuard
    systemctl enable wg-quick@${WG_INTERFACE}
    systemctl start wg-quick@${WG_INTERFACE}
    
    # Check status
    if systemctl is-active --quiet wg-quick@${WG_INTERFACE}; then
        print_info "WireGuard started successfully"
        wg show
    else
        print_error "Failed to start WireGuard"
        systemctl status wg-quick@${WG_INTERFACE}
        exit 1
    fi
}

show_usage() {
    echo "Usage: $0 [management|edge]"
    echo ""
    echo "  management  - Set up WireGuard on the management server"
    echo "  edge        - Set up WireGuard on an edge node"
    echo ""
    echo "Example:"
    echo "  sudo $0 management"
    echo "  sudo $0 edge"
}

main() {
    print_header
    
    if [[ $# -ne 1 ]]; then
        show_usage
        exit 1
    fi
    
    check_root
    check_wireguard
    
    case "$1" in
        "management")
            setup_management_server
            configure_firewall "management"
            ;;
        "edge")
            setup_edge_node
            configure_firewall "edge"
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    print_step "Configuration complete!"
    print_info "Review the configuration file at ${WG_DIR}/${WG_INTERFACE}.conf"
    print_info "Start WireGuard with: sudo systemctl start wg-quick@${WG_INTERFACE}"
    print_info "Enable on boot with: sudo systemctl enable wg-quick@${WG_INTERFACE}"
    
    echo ""
    print_warning "Next steps:"
    if [[ "$1" == "management" ]]; then
        echo "1. Copy the edge node configuration files to your edge nodes"
        echo "2. Update the management server config with edge node public keys"
        echo "3. Start WireGuard on all nodes"
        echo "4. Test connectivity with ping"
    else
        echo "1. Share your public key with the management server administrator"
        echo "2. Start WireGuard once the management server is configured"
        echo "3. Test connectivity to the management server"
    fi
}

main "$@"
