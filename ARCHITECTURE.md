# Teleport Architecture & Deployment Guide

## 🏗️ **System Architecture**

### **Core Concept**
Teleport is a **centralized controller** that manages a fleet of standard Caddy instances. You only need to install Teleport on ONE management host, while your edge nodes run standard Caddy with default configurations.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Management    │    │    WireGuard     │    │   Edge Nodes    │
│     Server      │    │     Network      │    │                 │
│                 │    │                  │    │                 │
│  ┌───────────┐  │    │                  │    │ ┌─────────────┐ │
│  │ Teleport  │──┼────┼──────────────────┼────┼─│ Caddy Slave │ │
│  │Controller │  │    │                  │    │ │   (2019)    │ │
│  │  (3333)   │  │    │                  │    │ └─────────────┘ │
│  └───────────┘  │    │                  │    │                 │
│  ┌───────────┐  │    │                  │    │ ┌─────────────┐ │
│  │  Web UI   │  │    │                  │    │ │ Caddy Slave │ │
│  │  (5173)   │  │    │                  │    │ │   (2019)    │ │
│  └───────────┘  │    │                  │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Component Details**

#### **1. Teleport Controller (Management Server)**
- **Single binary** written in Go
- **Port 3333** for API (fixed for both dev/prod)
- **SQLite database** for persistence
- **Pushes configurations** to Caddy slaves via HTTP API
- **Tracks sync status** and handles rollbacks

#### **2. Caddy Slaves (Edge Nodes)**
- **Standard Caddy installation** - no modifications needed
- **Default admin API** enabled on port 2019
- **Blank/default configuration** initially
- **Receives configs** from Teleport via admin API
- **No special setup required**

#### **3. Web UI (Optional)**
- **Remix frontend** on port 5173 (dev)
- **Connects to Teleport API** on port 3333
- **Modern glassmorphism UI** for fleet management

## 🔄 **Configuration Flow**

### **How Configuration Pushing Works**

1. **Admin creates/updates config** via Web UI or API
2. **Teleport validates** the JSON configuration
3. **Teleport stores** new version in database
4. **Teleport pushes** to all enabled slaves **asynchronously**
5. **Each slave receives** config via Caddy's `/load` endpoint
6. **Caddy applies** the configuration immediately
7. **Teleport tracks** success/failure per slave

### **API Endpoints Used**

**Teleport → Caddy Communication:**
```bash
# Push configuration to slave
POST http://{slave_ip}:2019/load
Content-Type: application/json

{
  "apps": {
    "http": {
      "servers": {
        "example": {
          "listen": [":80"],
          "routes": [...]
        }
      }
    }
  }
}

# Get current configuration (for drift detection)
GET http://{slave_ip}:2019/config/
```

## 🚀 **Deployment Scenarios**

### **Scenario 1: Simple Setup**
```
Management Server (Teleport) ──→ Edge Node 1 (Caddy)
                             ──→ Edge Node 2 (Caddy)
                             ──→ Edge Node 3 (Caddy)
```

### **Scenario 2: Anycast Edge Network**
```
Management Server (Teleport) ──→ Singapore Edge (Caddy)
                             ──→ London Edge (Caddy)
                             ──→ New York Edge (Caddy)
                             ──→ Tokyo Edge (Caddy)
```

## 📋 **Installation Requirements**

### **Management Server**
- **Teleport binary** (single Go executable)
- **SQLite** (embedded, no separate install)
- **WireGuard connectivity** to edge nodes
- **Web browser** for UI access

### **Edge Nodes (Caddy Slaves)**
- **Standard Caddy installation**
- **Admin API enabled** (default behavior)
- **WireGuard connectivity** to management server
- **No special configuration** required

## 🔧 **Configuration Examples**

### **Adding a Slave**
```bash
curl -X POST http://localhost:3333/api/v1/slaves \
  -H "Content-Type: application/json" \
  -d '{
    "name": "edge-singapore-01",
    "wireguard_ip": "10.0.1.10",
    "caddy_admin_port": 2019,
    "caddy_admin_api_scheme": "http",
    "is_enabled": true
  }'
```

### **Pushing Configuration**
```bash
curl -X POST http://localhost:3333/api/v1/configurations/active \
  -H "Content-Type: application/json" \
  -d '{
    "json_config": "{\"apps\":{\"http\":{\"servers\":{\"web\":{\"listen\":[\":80\"],\"routes\":[{\"handle\":[{\"handler\":\"static_response\",\"body\":\"Hello from Caddy!\"}]}]}}}}}",
    "description": "Simple hello world configuration"
  }'
```

## 🔒 **Security Model**

### **Network Security**
- **WireGuard VPN** between management and edge nodes
- **Private IP addressing** for admin APIs
- **No public exposure** of Caddy admin APIs

### **Access Control**
- **Management server** is the single point of control
- **Edge nodes** only accept configs from management server
- **Web UI** only accessible from management network

## 📊 **Operational Benefits**

### **Centralized Management**
- ✅ **Single source of truth** for all configurations
- ✅ **Version control** with automatic rollback
- ✅ **Fleet-wide updates** in seconds
- ✅ **Real-time status** monitoring

### **Edge Simplicity**
- ✅ **Standard Caddy** - no custom builds
- ✅ **Zero configuration** on edge nodes
- ✅ **Automatic updates** from central controller
- ✅ **No local state** to manage

### **Reliability**
- ✅ **Async operations** don't block on slow nodes
- ✅ **Per-slave error tracking** and recovery
- ✅ **Rollback capability** for failed deployments
- ✅ **Health monitoring** and alerting

## 🎯 **Confirmed: This is the Correct Architecture**

**YES** - Teleport pushes configurations to standard Caddy instances using Caddy's built-in admin API. You only need to install Teleport on your management server, and your edge nodes can run completely standard Caddy installations with default configurations.

The system is designed exactly as you described:
- **Teleport = Management Controller** (one installation)
- **Caddy Slaves = Standard Caddy** (multiple edge nodes)
- **Communication = HTTP API** over WireGuard
- **Port 3333 = Teleport API** (fixed for dev/prod)
- **Port 2019 = Caddy Admin API** (Caddy's default)
