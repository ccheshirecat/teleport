package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Configuration represents a Caddy configuration version
type Configuration struct {
	ID          string    `json:"id" db:"id"`
	VersionID   string    `json:"version_id" db:"version_id"`
	JSONConfig  string    `json:"json_config" db:"json_config"`
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	IsActive    bool      `json:"is_active" db:"is_active"`
}

// NewConfiguration creates a new configuration with generated IDs
func NewConfiguration(jsonConfig, description string) *Configuration {
	now := time.Now()
	return &Configuration{
		ID:          uuid.New().String(),
		VersionID:   generateVersionID(now),
		JSONConfig:  jsonConfig,
		Description: description,
		CreatedAt:   now,
		IsActive:    false,
	}
}

// Slave represents a Caddy instance that can be managed
type Slave struct {
	ID                       string     `json:"id" db:"id"`
	Name                     string     `json:"name" db:"name"`
	WireGuardIP              string     `json:"wireguard_ip" db:"wireguard_ip"`
	CaddyAdminPort           int        `json:"caddy_admin_port" db:"caddy_admin_port"`
	CaddyAdminAPIScheme      string     `json:"caddy_admin_api_scheme" db:"caddy_admin_api_scheme"`
	IsEnabled                bool       `json:"is_enabled" db:"is_enabled"`
	LastKnownConfigVersionID *string    `json:"last_known_config_version_id" db:"last_known_config_version_id"`
	LastSyncStatus           string     `json:"last_sync_status" db:"last_sync_status"`
	LastSyncMessage          string     `json:"last_sync_message" db:"last_sync_message"`
	LastSyncTimestamp        *time.Time `json:"last_sync_timestamp" db:"last_sync_timestamp"`
	AddedAt                  time.Time  `json:"added_at" db:"added_at"`
}

// NewSlave creates a new slave with generated ID
func NewSlave(name, wireGuardIP string, caddyAdminPort int, scheme string) *Slave {
	return &Slave{
		ID:                  uuid.New().String(),
		Name:                name,
		WireGuardIP:         wireGuardIP,
		CaddyAdminPort:      caddyAdminPort,
		CaddyAdminAPIScheme: scheme,
		IsEnabled:           true,
		LastSyncStatus:      "pending",
		AddedAt:             time.Now(),
	}
}

// GetAdminURL returns the full admin API URL for this slave
func (s *Slave) GetAdminURL() string {
	return fmt.Sprintf("%s://%s:%d", s.CaddyAdminAPIScheme, s.WireGuardIP, s.CaddyAdminPort)
}

// SyncResult represents the result of a configuration sync operation
type SyncResult struct {
	SlaveID   string    `json:"slave_id"`
	Success   bool      `json:"success"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// ConfigurationRequest represents a request to update configuration
type ConfigurationRequest struct {
	JSONConfig  string `json:"json_config" binding:"required"`
	Description string `json:"description"`
}

// SlaveRequest represents a request to create or update a slave
type SlaveRequest struct {
	Name                string `json:"name" binding:"required"`
	WireGuardIP         string `json:"wireguard_ip" binding:"required"`
	CaddyAdminPort      int    `json:"caddy_admin_port"`
	CaddyAdminAPIScheme string `json:"caddy_admin_api_scheme"`
	IsEnabled           *bool  `json:"is_enabled"`
}

// Validate validates the slave request and sets defaults
func (sr *SlaveRequest) Validate() error {
	if sr.CaddyAdminPort == 0 {
		sr.CaddyAdminPort = 2019
	}
	if sr.CaddyAdminAPIScheme == "" {
		sr.CaddyAdminAPIScheme = "http"
	}
	if sr.IsEnabled == nil {
		enabled := true
		sr.IsEnabled = &enabled
	}
	return nil
}

// generateVersionID generates a version ID based on timestamp
func generateVersionID(t time.Time) string {
	return t.Format("20060102-150405")
}
