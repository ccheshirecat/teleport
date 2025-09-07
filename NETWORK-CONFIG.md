# Network Configuration Guide

This guide shows how to configure Teleport to listen on specific IP addresses for security.

## 🔒 **Secure Network Configuration**

### **Your Use Case: SSH Proxy Access**
You want to:
- Bind Teleport API to `10.0.0.10:3333` (internal subnet)
- Access via SSH proxy tunnel
- Prevent external access

## ⚙️ **Configure Teleport API (Backend)**

### **1. Update Configuration File**

Edit your `config.yaml`:

```yaml
server:
  host: "10.0.0.10"    # Bind to specific internal IP
  port: 3333
  mode: production

database:
  path: /opt/teleport/data/teleport.db

logging:
  level: info
  format: json
```

### **2. Alternative: Environment Variables**

```bash
# Set via environment variables
export TELEPORT_SERVER_HOST="10.0.0.10"
export TELEPORT_SERVER_PORT="3333"
export TELEPORT_SERVER_MODE="production"
```

### **3. Command Line Override**

```bash
# Start with specific host (if you add CLI flag support)
./teleport --host 10.0.0.10 --port 3333
```

## 🌐 **Configure Web Interface (Frontend)**

### **Option 1: Environment Variable (Recommended)**

When running the Remix dev server:

```bash
cd web
export TELEPORT_API_URL="http://10.0.0.10:3333"
bun run dev --host 10.0.0.10 --port 5173
```

### **Option 2: Vite Configuration**

Create `web/vite.config.ts`:

```typescript
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [remix()],
  server: {
    host: "10.0.0.10",  // Bind to specific IP
    port: 5173,
  },
  define: {
    'process.env.TELEPORT_API_URL': '"http://10.0.0.10:3333"'
  }
});
```

### **Option 3: Production Build**

For production deployment, build the frontend and serve it via a reverse proxy:

```bash
cd web
export TELEPORT_API_URL="http://10.0.0.10:3333"
bun run build

# Serve with nginx/caddy on 10.0.0.10
```

## 🔧 **SSH Proxy Setup**

### **From Your Local Machine**

```bash
# SSH tunnel to access internal subnet
ssh -L 3333:10.0.0.10:3333 -L 5173:10.0.0.10:5173 user@your-server

# Now access locally:
# Teleport API: http://localhost:3333
# Web UI: http://localhost:5173
```

### **SSH Config for Convenience**

Add to `~/.ssh/config`:

```
Host teleport-tunnel
    HostName your-server.com
    User your-username
    LocalForward 3333 10.0.0.10:3333
    LocalForward 5173 10.0.0.10:5173
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then connect with:
```bash
ssh teleport-tunnel
```

## 🛡️ **Firewall Configuration**

### **Restrict Access to Internal Network**

```bash
# UFW (Ubuntu/Debian)
sudo ufw deny 3333
sudo ufw allow from 10.0.0.0/24 to any port 3333
sudo ufw allow from 127.0.0.1 to any port 3333

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --remove-port=3333/tcp
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port protocol="tcp" port="3333" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" port protocol="tcp" port="3333" accept'
sudo firewall-cmd --reload
```

### **Block External Access**

```bash
# Ensure no external access
sudo netstat -tlnp | grep :3333
# Should show: 10.0.0.10:3333, not 0.0.0.0:3333
```

## 📋 **Complete Setup Example**

### **1. Server Configuration**

`/opt/teleport/config.yaml`:
```yaml
server:
  host: "10.0.0.10"
  port: 3333
  mode: production

database:
  path: /opt/teleport/data/teleport.db

logging:
  level: info
  format: json
```

### **2. Start Teleport Service**

```bash
sudo systemctl restart teleport
sudo systemctl status teleport

# Verify binding
sudo netstat -tlnp | grep teleport
# Should show: 10.0.0.10:3333
```

### **3. Frontend Development**

```bash
cd web
export TELEPORT_API_URL="http://10.0.0.10:3333"
bun run dev --host 10.0.0.10
```

### **4. Access via SSH Tunnel**

```bash
# From your local machine
ssh -L 3333:10.0.0.10:3333 -L 5173:10.0.0.10:5173 user@server

# Access in browser:
# http://localhost:5173 (Web UI)
# http://localhost:3333/api/v1/status (API)
```

## 🔍 **Verification**

### **Test Network Binding**

```bash
# On server - check what's listening
sudo ss -tlnp | grep :3333
# Should show: 10.0.0.10:3333

# Test local access
curl http://10.0.0.10:3333/health

# Test external access (should fail)
curl http://your-server-public-ip:3333/health
# Should timeout or be refused
```

### **Test SSH Tunnel**

```bash
# From local machine with tunnel active
curl http://localhost:3333/health
# Should return: {"status":"ok"}
```

## 🚨 **Security Notes**

1. **Never bind to 0.0.0.0** in production
2. **Use specific internal IPs** (10.0.0.10)
3. **Configure firewall rules** to restrict access
4. **Use SSH tunnels** for remote access
5. **Monitor access logs** for unauthorized attempts

## 🔧 **Troubleshooting**

### **Can't Connect to API**

```bash
# Check if service is running
sudo systemctl status teleport

# Check what IP it's bound to
sudo ss -tlnp | grep :3333

# Check firewall
sudo ufw status
sudo iptables -L | grep 3333
```

### **SSH Tunnel Issues**

```bash
# Test SSH connection first
ssh user@server

# Check if ports are available locally
netstat -tln | grep :3333
netstat -tln | grep :5173

# Kill existing tunnels
pkill -f "ssh.*3333"
```

Your Teleport setup will now be securely accessible only via your internal network and SSH tunnels! 🔒
