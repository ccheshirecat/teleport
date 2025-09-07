.PHONY: build run test clean install dev help install-service uninstall-service start-service stop-service status-service

# Variables
BINARY_NAME=teleport
MAIN_PATH=cmd/teleport/main.go
BUILD_DIR=build
VERSION?=dev
LDFLAGS=-ldflags "-X main.version=$(VERSION)"

# Find Go binary (handle common installation paths)
GO_BIN := $(shell which go 2>/dev/null || echo "/usr/local/go/bin/go")
ifeq ($(shell test -x $(GO_BIN) && echo yes),yes)
    GO := $(GO_BIN)
else
    GO := go
endif

# Installation paths
INSTALL_DIR=/opt/teleport
BINARY_PATH=$(INSTALL_DIR)/$(BINARY_NAME)
CONFIG_PATH=$(INSTALL_DIR)/config.yaml
SERVICE_NAME=teleport.service
SERVICE_PATH=/etc/systemd/system/$(SERVICE_NAME)
USER=teleport
GROUP=teleport

# Default target
help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build-web: ## Build the web UI
	@echo "Building web UI..."
	@if [ -d "web" ] && [ -f "web/package.json" ]; then \
		cd web && \
		if which bun >/dev/null 2>&1; then \
			echo "Using bun from PATH to build web UI..."; \
			bun install && bun run build; \
		elif /root/.bun/bin/bun --version >/dev/null 2>&1; then \
			echo "Using local bun to build web UI..."; \
			/root/.bun/bin/bun install && /root/.bun/bin/bun run build; \
		elif which npm >/dev/null 2>&1; then \
			echo "Using npm to build web UI..."; \
			npm install && npm run build; \
		else \
			echo "Warning: Neither bun nor npm found. Using placeholder."; \
			mkdir -p build/client; \
			echo "Web UI build tools not available" > build/client/index.html; \
		fi; \
		if [ -d "build/client" ]; then \
			mkdir -p ../internal/web/dist; \
			cp -r build/client/* ../internal/web/dist/ 2>/dev/null || true; \
			echo "✅ Web UI built and embedded successfully"; \
		else \
			echo "⚠️  Web UI build failed, using placeholder"; \
			mkdir -p ../internal/web/dist; \
			cp ../internal/web/dist/index.html ../internal/web/dist/index.html 2>/dev/null || echo "Placeholder" > ../internal/web/dist/index.html; \
		fi; \
	else \
		echo "Web directory or package.json not found. Using embedded placeholder..."; \
		mkdir -p internal/web/dist; \
		echo "✅ Using pre-built embedded web UI"; \
	fi
	@echo "Web UI build complete"

build: ## Build the application
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@echo "Ensuring CGO is enabled for SQLite support..."
	@if ! command -v gcc >/dev/null 2>&1; then \
		echo "Error: gcc not found. Install build tools:"; \
		echo "  Ubuntu/Debian: sudo apt install build-essential"; \
		echo "  CentOS/RHEL:   sudo dnf groupinstall 'Development Tools'"; \
		exit 1; \
	fi
	CGO_ENABLED=1 $(GO) build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) ./$(MAIN_PATH)
	@echo "Built $(BUILD_DIR)/$(BINARY_NAME) with embedded web UI"

build-all: ## Build for multiple platforms
	@echo "Building for multiple platforms..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 $(GO) build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 ./$(MAIN_PATH)
	CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 $(GO) build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 ./$(MAIN_PATH)
	CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 $(GO) build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 ./$(MAIN_PATH)
	CGO_ENABLED=1 GOOS=windows GOARCH=amd64 $(GO) build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe ./$(MAIN_PATH)
	@echo "Built binaries in $(BUILD_DIR)/"

run: build ## Build and run the application
	@echo "Running $(BINARY_NAME)..."
	./$(BUILD_DIR)/$(BINARY_NAME)

dev: ## Run in development mode with hot reload (requires air)
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Air not found. Install with: go install github.com/cosmtrek/air@latest"; \
		echo "Running without hot reload..."; \
		go run $(MAIN_PATH); \
	fi

test: ## Run tests
	@echo "Running tests..."
	$(GO) test -v ./...

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	$(GO) test -v -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

install: ## Install dependencies
	@echo "Installing dependencies..."
	$(GO) mod download
	$(GO) mod tidy

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR)
	rm -rf internal/web/dist
	rm -rf web/dist
	rm -f coverage.out coverage.html
	rm -f $(BINARY_NAME)
	rm -f teleport.db

fmt: ## Format code
	@echo "Formatting code..."
	$(GO) fmt ./...

lint: ## Run linter (requires golangci-lint)
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not found. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi



# Database operations
db-reset: ## Reset the database (removes teleport.db)
	@echo "Resetting database..."
	rm -f teleport.db
	@echo "Database reset. It will be recreated on next run."

# Development helpers
deps-update: ## Update dependencies
	@echo "Updating dependencies..."
	$(GO) get -u ./...
	$(GO) mod tidy

# Release helpers
release: clean test build-all ## Clean, test, and build for all platforms
	@echo "Release build complete!"

# System service management
install-service: build ## Install Teleport as a systemd service
	@echo "Installing Teleport as a systemd service..."
	@if [ "$$(id -u)" != "0" ]; then \
		echo "Error: This target must be run as root (use sudo)"; \
		exit 1; \
	fi

	# Create teleport user and group
	@if ! id $(USER) >/dev/null 2>&1; then \
		echo "Creating user $(USER)..."; \
		useradd --system --home $(INSTALL_DIR) --shell /bin/false $(USER); \
	fi

	# Create installation directory
	@echo "Creating installation directory..."
	mkdir -p $(INSTALL_DIR)
	mkdir -p $(INSTALL_DIR)/data

	# Copy binary
	@echo "Installing binary..."
	cp $(BUILD_DIR)/$(BINARY_NAME) $(BINARY_PATH)
	chmod +x $(BINARY_PATH)

	# Copy web directory
	@echo "Installing web UI..."
	@if [ -d "web" ]; then \
		cp -r web $(INSTALL_DIR)/; \
		echo "Web UI installed"; \
	else \
		echo "Web directory not found, web UI will not be available"; \
	fi

	# Copy configuration
	@echo "Installing configuration..."
	if [ ! -f $(CONFIG_PATH) ]; then \
		cp config.yaml.example $(CONFIG_PATH); \
		echo "Configuration installed at $(CONFIG_PATH)"; \
		echo "Please review and modify as needed"; \
	else \
		echo "Configuration already exists at $(CONFIG_PATH)"; \
	fi

	# Set ownership
	@echo "Setting ownership..."
	chown -R $(USER):$(GROUP) $(INSTALL_DIR)

	# Create systemd service file
	@echo "Creating systemd service..."
	@echo '[Unit]' > $(SERVICE_PATH)
	@echo 'Description=Teleport Caddy Controller' >> $(SERVICE_PATH)
	@echo 'Documentation=https://github.com/ccheshirecat/teleport' >> $(SERVICE_PATH)
	@echo 'After=network.target network-online.target' >> $(SERVICE_PATH)
	@echo 'Wants=network-online.target' >> $(SERVICE_PATH)
	@echo '' >> $(SERVICE_PATH)
	@echo '[Service]' >> $(SERVICE_PATH)
	@echo 'Type=simple' >> $(SERVICE_PATH)
	@echo 'User=$(USER)' >> $(SERVICE_PATH)
	@echo 'Group=$(GROUP)' >> $(SERVICE_PATH)
	@echo 'WorkingDirectory=$(INSTALL_DIR)' >> $(SERVICE_PATH)
	@echo 'ExecStart=$(BINARY_PATH) --config $(CONFIG_PATH) --database $(INSTALL_DIR)/data/teleport.db' >> $(SERVICE_PATH)
	@echo 'ExecReload=/bin/kill -HUP $$$$MAINPID' >> $(SERVICE_PATH)
	@echo 'Restart=always' >> $(SERVICE_PATH)
	@echo 'RestartSec=5' >> $(SERVICE_PATH)
	@echo 'TimeoutStopSec=30' >> $(SERVICE_PATH)
	@echo 'KillMode=mixed' >> $(SERVICE_PATH)
	@echo '' >> $(SERVICE_PATH)
	@echo '# Security settings' >> $(SERVICE_PATH)
	@echo 'NoNewPrivileges=true' >> $(SERVICE_PATH)
	@echo 'PrivateTmp=true' >> $(SERVICE_PATH)
	@echo 'ProtectSystem=strict' >> $(SERVICE_PATH)
	@echo 'ProtectHome=true' >> $(SERVICE_PATH)
	@echo 'ReadWritePaths=$(INSTALL_DIR)' >> $(SERVICE_PATH)
	@echo 'ProtectKernelTunables=true' >> $(SERVICE_PATH)
	@echo 'ProtectKernelModules=true' >> $(SERVICE_PATH)
	@echo 'ProtectControlGroups=true' >> $(SERVICE_PATH)
	@echo '' >> $(SERVICE_PATH)
	@echo '# Logging' >> $(SERVICE_PATH)
	@echo 'StandardOutput=journal' >> $(SERVICE_PATH)
	@echo 'StandardError=journal' >> $(SERVICE_PATH)
	@echo 'SyslogIdentifier=teleport' >> $(SERVICE_PATH)
	@echo '' >> $(SERVICE_PATH)
	@echo '[Install]' >> $(SERVICE_PATH)
	@echo 'WantedBy=multi-user.target' >> $(SERVICE_PATH)

	# Reload systemd and enable service
	@echo "Enabling systemd service..."
	systemctl daemon-reload
	systemctl enable $(SERVICE_NAME)

	@echo ""
	@echo "✅ Teleport service installed successfully!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Review configuration: $(CONFIG_PATH)"
	@echo "  2. Start the service: sudo make start-service"
	@echo "  3. Check status: sudo make status-service"
	@echo "  4. View logs: sudo journalctl -u $(SERVICE_NAME) -f"

uninstall-service: ## Uninstall Teleport systemd service
	@echo "Uninstalling Teleport systemd service..."
	@if [ "$$(id -u)" != "0" ]; then \
		echo "Error: This target must be run as root (use sudo)"; \
		exit 1; \
	fi

	# Stop and disable service
	-systemctl stop $(SERVICE_NAME)
	-systemctl disable $(SERVICE_NAME)

	# Remove service file
	-rm -f $(SERVICE_PATH)

	# Reload systemd
	systemctl daemon-reload

	# Remove installation directory (with confirmation)
	@echo "Remove installation directory $(INSTALL_DIR)? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		rm -rf $(INSTALL_DIR); \
		echo "Installation directory removed"; \
	else \
		echo "Installation directory preserved"; \
	fi

	# Remove user (with confirmation)
	@echo "Remove user $(USER)? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		userdel $(USER); \
		echo "User $(USER) removed"; \
	else \
		echo "User $(USER) preserved"; \
	fi

	@echo "✅ Teleport service uninstalled"

start-service: ## Start Teleport service
	@echo "Starting Teleport service..."
	@if [ "$$(id -u)" != "0" ]; then \
		echo "Error: This target must be run as root (use sudo)"; \
		exit 1; \
	fi
	systemctl start $(SERVICE_NAME)
	@echo "✅ Teleport service started"

stop-service: ## Stop Teleport service
	@echo "Stopping Teleport service..."
	@if [ "$$(id -u)" != "0" ]; then \
		echo "Error: This target must be run as root (use sudo)"; \
		exit 1; \
	fi
	systemctl stop $(SERVICE_NAME)
	@echo "✅ Teleport service stopped"

restart-service: ## Restart Teleport service
	@echo "Restarting Teleport service..."
	@if [ "$$(id -u)" != "0" ]; then \
		echo "Error: This target must be run as root (use sudo)"; \
		exit 1; \
	fi
	systemctl restart $(SERVICE_NAME)
	@echo "✅ Teleport service restarted"

status-service: ## Show Teleport service status
	@echo "Teleport service status:"
	@systemctl status $(SERVICE_NAME) --no-pager || true
	@echo ""
	@echo "Recent logs:"
	@journalctl -u $(SERVICE_NAME) --no-pager -n 10 || true

logs-service: ## Show Teleport service logs
	@echo "Following Teleport service logs (Ctrl+C to exit):"
	journalctl -u $(SERVICE_NAME) -f

# Combined targets
deploy: build install-service start-service ## Build, install, and start Teleport service
	@echo "🚀 Teleport deployed successfully!"
	@echo ""
	@echo "Service is running on port 3333"
	@echo "Check status with: sudo make status-service"
	@echo "View logs with: sudo make logs-service"

.DEFAULT_GOAL := help
