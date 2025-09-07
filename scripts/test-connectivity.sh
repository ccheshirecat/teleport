#!/bin/bash

# Teleport WireGuard Connectivity Test Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
NETWORK_BASE="10.0.1"
MGMT_IP="${NETWORK_BASE}.1"
TELEPORT_PORT="3333"
CADDY_PORT="2019"

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  Teleport Connectivity Test"
    echo "=================================================="
    echo -e "${NC}"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

test_ping() {
    local target_ip=$1
    local description=$2
    
    print_test "Testing ping to ${description} (${target_ip})"
    
    if ping -c 3 -W 5 "${target_ip}" > /dev/null 2>&1; then
        print_success "Ping to ${description} successful"
        return 0
    else
        print_fail "Ping to ${description} failed"
        return 1
    fi
}

test_port() {
    local target_ip=$1
    local port=$2
    local description=$3
    
    print_test "Testing ${description} (${target_ip}:${port})"
    
    if timeout 10 bash -c "</dev/tcp/${target_ip}/${port}" > /dev/null 2>&1; then
        print_success "${description} port is open"
        return 0
    else
        print_fail "${description} port is not accessible"
        return 1
    fi
}

test_http_endpoint() {
    local url=$1
    local description=$2
    
    print_test "Testing HTTP endpoint: ${description}"
    
    if curl -s --connect-timeout 10 --max-time 15 "${url}" > /dev/null 2>&1; then
        print_success "${description} HTTP endpoint is accessible"
        return 0
    else
        print_fail "${description} HTTP endpoint is not accessible"
        return 1
    fi
}

test_caddy_api() {
    local caddy_ip=$1
    local node_name=$2
    
    print_test "Testing Caddy Admin API on ${node_name} (${caddy_ip}:${CADDY_PORT})"
    
    local response
    response=$(curl -s --connect-timeout 10 --max-time 15 "http://${caddy_ip}:${CADDY_PORT}/config/" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        print_success "Caddy Admin API on ${node_name} is accessible"
        if [[ -n "$response" ]]; then
            print_info "Caddy is running with configuration"
        else
            print_info "Caddy is running with default/empty configuration"
        fi
        return 0
    else
        print_fail "Caddy Admin API on ${node_name} is not accessible"
        return 1
    fi
}

test_teleport_api() {
    print_test "Testing Teleport API (${MGMT_IP}:${TELEPORT_PORT})"
    
    local response
    response=$(curl -s --connect-timeout 10 --max-time 15 "http://${MGMT_IP}:${TELEPORT_PORT}/health" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ "$response" == *"ok"* ]]; then
        print_success "Teleport API is accessible and healthy"
        return 0
    else
        print_fail "Teleport API is not accessible or unhealthy"
        return 1
    fi
}

check_wireguard_status() {
    print_test "Checking WireGuard status"
    
    if command -v wg &> /dev/null; then
        if wg show > /dev/null 2>&1; then
            print_success "WireGuard is running"
            echo ""
            wg show
            echo ""
            return 0
        else
            print_fail "WireGuard is not running"
            return 1
        fi
    else
        print_fail "WireGuard is not installed"
        return 1
    fi
}

test_from_management() {
    print_header
    print_info "Running tests from Management Server"
    echo ""
    
    local total_tests=0
    local passed_tests=0
    
    # Check WireGuard status
    ((total_tests++))
    if check_wireguard_status; then
        ((passed_tests++))
    fi
    
    # Test edge nodes
    echo ""
    print_info "Enter edge node IPs (one per line, empty line to finish):"
    
    local edge_ips=()
    while true; do
        read -p "Edge node IP: " edge_ip
        if [[ -z "$edge_ip" ]]; then
            break
        fi
        edge_ips+=("$edge_ip")
    done
    
    if [[ ${#edge_ips[@]} -eq 0 ]]; then
        print_info "No edge nodes specified. Using default range ${NETWORK_BASE}.10-12"
        edge_ips=("${NETWORK_BASE}.10" "${NETWORK_BASE}.11" "${NETWORK_BASE}.12")
    fi
    
    echo ""
    for i in "${!edge_ips[@]}"; do
        local edge_ip="${edge_ips[$i]}"
        local node_name="Edge Node $((i+1))"
        
        print_info "Testing ${node_name} (${edge_ip})"
        
        # Test ping
        ((total_tests++))
        if test_ping "${edge_ip}" "${node_name}"; then
            ((passed_tests++))
        fi
        
        # Test Caddy admin port
        ((total_tests++))
        if test_port "${edge_ip}" "${CADDY_PORT}" "Caddy Admin API"; then
            ((passed_tests++))
        fi
        
        # Test Caddy API endpoint
        ((total_tests++))
        if test_caddy_api "${edge_ip}" "${node_name}"; then
            ((passed_tests++))
        fi
        
        echo ""
    done
    
    # Summary
    echo ""
    print_info "Test Summary: ${passed_tests}/${total_tests} tests passed"
    
    if [[ $passed_tests -eq $total_tests ]]; then
        print_success "All tests passed! Your WireGuard network is ready for Teleport."
    else
        print_fail "Some tests failed. Please check your WireGuard configuration."
        exit 1
    fi
}

test_from_edge() {
    print_header
    print_info "Running tests from Edge Node"
    echo ""
    
    local total_tests=0
    local passed_tests=0
    
    # Check WireGuard status
    ((total_tests++))
    if check_wireguard_status; then
        ((passed_tests++))
    fi
    
    echo ""
    
    # Test management server
    print_info "Testing Management Server (${MGMT_IP})"
    
    # Test ping to management
    ((total_tests++))
    if test_ping "${MGMT_IP}" "Management Server"; then
        ((passed_tests++))
    fi
    
    # Test Teleport port
    ((total_tests++))
    if test_port "${MGMT_IP}" "${TELEPORT_PORT}" "Teleport API"; then
        ((passed_tests++))
    fi
    
    # Test Teleport API endpoint
    ((total_tests++))
    if test_teleport_api; then
        ((passed_tests++))
    fi
    
    # Check if Caddy is running locally
    echo ""
    print_info "Checking local Caddy installation"
    
    if command -v caddy &> /dev/null; then
        print_success "Caddy is installed"
        
        # Check if Caddy admin API is accessible locally
        ((total_tests++))
        if test_port "127.0.0.1" "${CADDY_PORT}" "Local Caddy Admin API"; then
            ((passed_tests++))
        fi
    else
        print_fail "Caddy is not installed"
        print_info "Install Caddy: https://caddyserver.com/docs/install"
    fi
    
    # Summary
    echo ""
    print_info "Test Summary: ${passed_tests}/${total_tests} tests passed"
    
    if [[ $passed_tests -eq $total_tests ]]; then
        print_success "All tests passed! This edge node is ready for Teleport."
    else
        print_fail "Some tests failed. Please check your configuration."
        exit 1
    fi
}

show_usage() {
    echo "Usage: $0 [management|edge]"
    echo ""
    echo "  management  - Run tests from the management server"
    echo "  edge        - Run tests from an edge node"
    echo ""
    echo "Example:"
    echo "  $0 management"
    echo "  $0 edge"
}

main() {
    if [[ $# -ne 1 ]]; then
        show_usage
        exit 1
    fi
    
    case "$1" in
        "management")
            test_from_management
            ;;
        "edge")
            test_from_edge
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
