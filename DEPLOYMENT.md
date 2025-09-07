# Teleport Deployment Guide

This guide covers deploying Teleport as a production systemd service using the automated Makefile targets.

## 🚀 **Quick Deployment**

### **One-Command Deployment**
```bash
# Build, install, and start Teleport service
sudo make deploy
```

This single command will:
1. ✅ Build the Teleport binary
2. ✅ Create a dedicated `teleport` user
3. ✅ Install to `/opt/teleport/`
4. ✅ Create systemd service with security hardening
5. ✅ Enable and start the service
6. ✅ Configure proper permissions and ownership

## 📋 **Step-by-Step Deployment**

### **1. Build the Application**
```bash
# Build Teleport binary
make build
```

### **2. Install as System Service**
```bash
# Install Teleport as a systemd service (requires root)
sudo make install-service
```

This creates:
- **User**: `teleport` (system user)
- **Installation**: `/opt/teleport/`
- **Configuration**: `/opt/teleport/config.yaml`
- **Database**: `/opt/teleport/data/teleport.db`
- **Service**: `/etc/systemd/system/teleport.service`

### **3. Configure Teleport**
```bash
# Edit configuration file
sudo nano /opt/teleport/config.yaml
```

Example production configuration:
```yaml
server:
  port: 3333
  mode: production

database:
  path: /opt/teleport/data/teleport.db

logging:
  level: info
  format: json
```

### **4. Start the Service**
```bash
# Start Teleport service
sudo make start-service

# Check status
sudo make status-service
```

## 🔧 **Service Management**

### **Available Commands**
```bash
# Service lifecycle
sudo make start-service      # Start the service
sudo make stop-service       # Stop the service
sudo make restart-service    # Restart the service
sudo make status-service     # Show service status

# Monitoring
sudo make logs-service       # Follow live logs
sudo journalctl -u teleport  # View all logs

# Installation management
sudo make install-service    # Install/reinstall service
sudo make uninstall-service  # Remove service and optionally data
```

### **Service Status Check**
```bash
$ sudo make status-service
Teleport service status:
● teleport.service - Teleport Caddy Controller
     Loaded: loaded (/etc/systemd/system/teleport.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2024-01-15 10:30:45 UTC; 2min 30s ago
       Docs: https://github.com/ccheshirecat/teleport
   Main PID: 12345 (teleport)
      Tasks: 8 (limit: 4915)
     Memory: 15.2M
        CPU: 1.234s
     CGroup: /system.slice/teleport.service
             └─12345 /opt/teleport/teleport --config /opt/teleport/config.yaml --database /opt/teleport/data/teleport.db

Recent logs:
Jan 15 10:30:45 server teleport[12345]: {"level":"info","msg":"Starting Teleport server","port":3333,"time":"2024-01-15T10:30:45Z"}
Jan 15 10:30:45 server teleport[12345]: {"level":"info","msg":"Database initialized","path":"/opt/teleport/data/teleport.db","time":"2024-01-15T10:30:45Z"}
```

## 🔒 **Security Features**

The systemd service includes comprehensive security hardening:

### **User Isolation**
- Runs as dedicated `teleport` system user
- No shell access (`/bin/false`)
- Home directory restricted to `/opt/teleport`

### **Filesystem Protection**
- `ProtectSystem=strict` - Read-only system directories
- `ProtectHome=true` - No access to user home directories
- `ReadWritePaths=/opt/teleport` - Only write access to app directory
- `PrivateTmp=true` - Private temporary directory

### **Kernel Protection**
- `ProtectKernelTunables=true` - No kernel parameter access
- `ProtectKernelModules=true` - No kernel module loading
- `ProtectControlGroups=true` - No cgroup access
- `NoNewPrivileges=true` - Cannot gain additional privileges

### **Process Management**
- `Restart=always` - Automatic restart on failure
- `RestartSec=5` - 5-second delay between restarts
- `TimeoutStopSec=30` - Graceful shutdown timeout
- `KillMode=mixed` - Proper signal handling

## 📁 **File Locations**

### **Installation Structure**
```
/opt/teleport/
├── teleport              # Main binary
├── config.yaml          # Configuration file
└── data/
    └── teleport.db       # SQLite database
```

### **System Files**
```
/etc/systemd/system/teleport.service  # Systemd service file
/var/log/journal/                     # Service logs (via journald)
```

### **User Account**
```
User: teleport
Group: teleport
Home: /opt/teleport
Shell: /bin/false (no login)
```

## 🔧 **Configuration Management**

### **Update Configuration**
```bash
# Edit configuration
sudo nano /opt/teleport/config.yaml

# Restart service to apply changes
sudo make restart-service
```

### **Database Management**
```bash
# Backup database
sudo cp /opt/teleport/data/teleport.db /opt/teleport/data/teleport.db.backup

# Reset database (removes all data)
sudo systemctl stop teleport
sudo rm /opt/teleport/data/teleport.db
sudo systemctl start teleport
```

### **Log Management**
```bash
# View recent logs
sudo journalctl -u teleport -n 50

# Follow live logs
sudo journalctl -u teleport -f

# View logs from specific time
sudo journalctl -u teleport --since "2024-01-15 10:00:00"

# Export logs
sudo journalctl -u teleport --since today > teleport.log
```

## 🚨 **Troubleshooting**

### **Service Won't Start**
```bash
# Check service status
sudo systemctl status teleport

# Check configuration syntax
sudo /opt/teleport/teleport --config /opt/teleport/config.yaml --help

# Check file permissions
sudo ls -la /opt/teleport/
sudo ls -la /opt/teleport/data/
```

### **Permission Issues**
```bash
# Fix ownership
sudo chown -R teleport:teleport /opt/teleport/

# Fix permissions
sudo chmod 755 /opt/teleport/
sudo chmod 644 /opt/teleport/config.yaml
sudo chmod 755 /opt/teleport/data/
sudo chmod 644 /opt/teleport/data/teleport.db
```

### **Port Already in Use**
```bash
# Check what's using port 3333
sudo netstat -tlnp | grep 3333
sudo ss -tlnp | grep 3333

# Change port in configuration
sudo nano /opt/teleport/config.yaml
sudo systemctl restart teleport
```

### **Database Issues**
```bash
# Check database file
sudo file /opt/teleport/data/teleport.db
sudo sqlite3 /opt/teleport/data/teleport.db ".tables"

# Reset database if corrupted
sudo systemctl stop teleport
sudo rm /opt/teleport/data/teleport.db
sudo systemctl start teleport
```

## 🔄 **Updates and Maintenance**

### **Update Teleport**
```bash
# Stop service
sudo make stop-service

# Build new version
make build

# Install updated binary
sudo cp build/teleport /opt/teleport/teleport
sudo chown teleport:teleport /opt/teleport/teleport
sudo chmod +x /opt/teleport/teleport

# Start service
sudo make start-service
```

### **Backup and Restore**
```bash
# Backup
sudo tar -czf teleport-backup-$(date +%Y%m%d).tar.gz -C /opt teleport

# Restore
sudo systemctl stop teleport
sudo tar -xzf teleport-backup-YYYYMMDD.tar.gz -C /opt
sudo systemctl start teleport
```

## 🌐 **Firewall Configuration**

### **UFW (Ubuntu/Debian)**
```bash
# Allow Teleport API
sudo ufw allow 3333/tcp

# Allow from specific networks only (recommended)
sudo ufw allow from 10.0.1.0/24 to any port 3333

# Enable firewall
sudo ufw enable
```

### **Firewalld (CentOS/RHEL)**
```bash
# Allow Teleport API
sudo firewall-cmd --permanent --add-port=3333/tcp
sudo firewall-cmd --reload

# Allow from specific networks only
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.1.0/24" port protocol="tcp" port="3333" accept'
sudo firewall-cmd --reload
```

## ✅ **Production Checklist**

- [ ] **Service installed** and running
- [ ] **Configuration reviewed** and customized
- [ ] **Firewall configured** to restrict access
- [ ] **WireGuard network** set up and tested
- [ ] **Backup strategy** implemented
- [ ] **Monitoring** configured (logs, status checks)
- [ ] **SSL/TLS** configured if exposing publicly
- [ ] **Authentication** implemented (future feature)

Your Teleport service is now ready for production! 🎉
