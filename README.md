# Teleport (TCC) - Teleport Caddy Controller

A centralized management system for a fleet of Caddy instances acting as reverse proxies on anycast edge nodes, enabling dynamic configuration updates, versioning, and rollback capabilities via a web UI and an internal API.

## Features

- **Centralized Configuration Management**: Manage Caddy configurations from a single control plane
- **Version Control**: Track configuration changes with automatic versioning
- **Rollback Capability**: Easily rollback to previous configurations
- **Multi-Instance Sync**: Push configurations to multiple Caddy instances simultaneously
- **Real-time Status**: Monitor sync status and health of all Caddy instances
- **RESTful API**: Complete API for programmatic management
- **Embedded Web UI**: Modern Remix-based interface built into the binary

## Architecture

### Components

1. **Teleport Controller**: Single Go binary with embedded web UI and API server
2. **SQLite Database**: Stores configurations, slave details, and version history
3. **Caddy Slaves**: Standard Caddy instances running with default config on edge nodes

### How It Works

**Teleport Controller** → **Caddy Admin API** → **Caddy Slaves**

1. **Teleport runs on ONE host** (your management server)
2. **Caddy slaves run standard Caddy** with default/blank config on edge nodes
3. **Teleport pushes configurations** to slaves via Caddy's built-in admin API (port 2019)
4. **Communication over WireGuard** ensures secure connectivity between controller and slaves
5. **No special Caddy setup required** - slaves just need admin API enabled (default)

### Communication Flow

- **Web Browser** ↔ **Teleport** (port 3333): Embedded web UI served by Teleport
- **Teleport** ↔ **Caddy Admin API** (port 2019): Configuration management via HTTP
- **All config pushes are async** with proper error handling and rollback capabilities

## Quick Start

### Prerequisites

- Go 1.21 or later
- Caddy instances with admin API enabled (default)
- WireGuard network connectivity to Caddy instances

**📋 WireGuard Setup Required:**
See [WIREGUARD-SETUP.md](WIREGUARD-SETUP.md) for detailed instructions on setting up secure tunnels between your management server and edge nodes.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd teleport
```

2. Install dependencies:
```bash
go mod tidy
```

3. Create configuration file:
```bash
cp config.yaml.example config.yaml
```

4. Build and run:
```bash
go build -o teleport cmd/teleport/main.go
./teleport
```

Or run directly:
```bash
go run cmd/teleport/main.go
```

### Production Deployment

For production deployment with systemd service:

```bash
# One-command deployment
sudo make deploy
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production deployment instructions.

### Configuration

The application can be configured via:
- Configuration file (`config.yaml`)
- Environment variables (prefixed with `TELEPORT_`)
- Command line flags

Example configuration:
```yaml
server:
  port: 3333
  mode: development

database:
  path: ./teleport.db

logging:
  level: info
  format: json
```

### Command Line Options

```bash
./teleport --help
```

- `--config, -c`: Configuration file path
- `--port, -p`: Server port (default: 3333)
- `--database, -d`: Database file path (default: ./teleport.db)

## API Documentation

### Configuration Endpoints

- `GET /api/v1/configurations/active` - Get current active configuration
- `POST /api/v1/configurations/active` - Set new active configuration
- `GET /api/v1/configurations/history` - Get configuration history
- `GET /api/v1/configurations/history/{version_id}` - Get specific configuration
- `POST /api/v1/configurations/rollback/{version_id}` - Rollback to specific version

### Slave Management Endpoints

- `GET /api/v1/slaves` - List all slaves
- `POST /api/v1/slaves` - Add new slave
- `GET /api/v1/slaves/{slave_id}` - Get slave details
- `PUT /api/v1/slaves/{slave_id}` - Update slave
- `DELETE /api/v1/slaves/{slave_id}` - Remove slave
- `POST /api/v1/slaves/{slave_id}/sync` - Force sync to specific slave

### Status Endpoint

- `GET /api/v1/status` - Get system status and health

### Example Usage

#### Add a new Caddy slave:
```bash
curl -X POST http://localhost:3333/api/v1/slaves \
  -H "Content-Type: application/json" \
  -d '{
    "name": "edge-sgp-01",
    "wireguard_ip": "10.0.1.10",
    "caddy_admin_port": 2019,
    "caddy_admin_api_scheme": "http",
    "is_enabled": true
  }'
```

#### Set a new active configuration:
```bash
curl -X POST http://localhost:3333/api/v1/configurations/active \
  -H "Content-Type: application/json" \
  -d '{
    "json_config": "{\"apps\":{\"http\":{\"servers\":{\"example\":{\"listen\":[\":80\"],\"routes\":[{\"handle\":[{\"handler\":\"static_response\",\"body\":\"Hello World\"}]}]}}}}}",
    "description": "Simple hello world configuration"
  }'
```

## Database Schema

### Configurations Table
- `id`: Unique configuration ID
- `version_id`: Human-readable version identifier
- `json_config`: Caddy JSON configuration
- `description`: User-provided description
- `created_at`: Creation timestamp
- `is_active`: Whether this is the active configuration

### Slaves Table
- `id`: Unique slave ID
- `name`: Human-readable slave name
- `wireguard_ip`: WireGuard IP address
- `caddy_admin_port`: Caddy admin API port
- `caddy_admin_api_scheme`: HTTP scheme (http/https)
- `is_enabled`: Whether slave is enabled for syncing
- `last_known_config_version_id`: Last successfully applied configuration
- `last_sync_status`: Status of last sync attempt
- `last_sync_message`: Details of last sync attempt
- `last_sync_timestamp`: Timestamp of last sync attempt
- `added_at`: When slave was added

## Development

### Project Structure

```
teleport/
├── cmd/teleport/           # Main application entry point
├── internal/
│   ├── api/               # HTTP API handlers and routes
│   ├── config/            # Configuration management
│   ├── database/          # Database setup and migrations
│   ├── models/            # Data models
│   └── service/           # Business logic services
├── web/                   # Frontend application (planned)
├── config.yaml.example   # Example configuration
└── README.md
```

### Building

```bash
# Build using Makefile (recommended)
make build

# Or build manually
go build -o teleport ./cmd/teleport/main.go

# Build for Linux
GOOS=linux GOARCH=amd64 go build -o teleport-linux ./cmd/teleport/main.go

# Build for multiple platforms
make build-all
```

### Troubleshooting Build Issues

If you encounter build errors on your production server:

```bash
# Run the debug script to identify issues
./debug-build.sh

# Run the fix script to resolve common problems
./fix-build.sh

# Manual troubleshooting
go mod tidy
go mod download
make build
```

Common issues:
- **Module path errors**: Ensure you're in the project root directory
- **Go version**: Requires Go 1.21+
- **Module mode**: Ensure `GO111MODULE=on` (default in Go 1.16+)

### Testing

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...
```

## Deployment

### Systemd Service

Teleport includes automated systemd service installation:

```bash
# Install and start service
sudo make deploy

# Or step by step
sudo make install-service  # Install service
sudo make start-service    # Start service
sudo make status-service   # Check status
```

The service includes security hardening and runs as a dedicated `teleport` user.

### Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o teleport cmd/teleport/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/teleport .
COPY --from=builder /app/config.yaml.example ./config.yaml
EXPOSE 3333
CMD ["./teleport"]
```

## Security Considerations

- Ensure WireGuard network is properly secured
- Use HTTPS for production deployments
- Implement authentication for the API (planned feature)
- Regularly backup the SQLite database
- Monitor logs for suspicious activity

## Roadmap

- [x] **Web UI implementation** (Remix-based, embedded) ✅ **COMPLETED**
- [x] **Single binary deployment** with embedded assets ✅ **COMPLETED**
- [ ] Authentication and authorization
- [ ] Configuration validation and testing
- [ ] Drift detection
- [ ] Webhook integration for Git-based workflows
- [ ] Metrics and monitoring integration
- [ ] Multi-tenant support
- [ ] Configuration templates and inheritance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[License information to be added]
