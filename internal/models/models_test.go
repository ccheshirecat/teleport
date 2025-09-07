package models

import (
	"testing"
	"time"
)

func TestNewConfiguration(t *testing.T) {
	jsonConfig := `{"test": "config"}`
	description := "Test configuration"

	config := NewConfiguration(jsonConfig, description)

	if config.ID == "" {
		t.Error("Expected ID to be generated")
	}

	if config.VersionID == "" {
		t.Error("Expected VersionID to be generated")
	}

	if config.JSONConfig != jsonConfig {
		t.Errorf("Expected JSONConfig to be %s, got %s", jsonConfig, config.JSONConfig)
	}

	if config.Description != description {
		t.Errorf("Expected Description to be %s, got %s", description, config.Description)
	}

	if config.IsActive {
		t.Error("Expected IsActive to be false by default")
	}

	if config.CreatedAt.IsZero() {
		t.Error("Expected CreatedAt to be set")
	}
}

func TestNewSlave(t *testing.T) {
	name := "test-slave"
	wireGuardIP := "10.0.1.10"
	port := 2019
	scheme := "http"

	slave := NewSlave(name, wireGuardIP, port, scheme)

	if slave.ID == "" {
		t.Error("Expected ID to be generated")
	}

	if slave.Name != name {
		t.Errorf("Expected Name to be %s, got %s", name, slave.Name)
	}

	if slave.WireGuardIP != wireGuardIP {
		t.Errorf("Expected WireGuardIP to be %s, got %s", wireGuardIP, slave.WireGuardIP)
	}

	if slave.CaddyAdminPort != port {
		t.Errorf("Expected CaddyAdminPort to be %d, got %d", port, slave.CaddyAdminPort)
	}

	if slave.CaddyAdminAPIScheme != scheme {
		t.Errorf("Expected CaddyAdminAPIScheme to be %s, got %s", scheme, slave.CaddyAdminAPIScheme)
	}

	if !slave.IsEnabled {
		t.Error("Expected IsEnabled to be true by default")
	}

	if slave.LastSyncStatus != "pending" {
		t.Errorf("Expected LastSyncStatus to be 'pending', got %s", slave.LastSyncStatus)
	}

	if slave.AddedAt.IsZero() {
		t.Error("Expected AddedAt to be set")
	}
}

func TestSlaveGetAdminURL(t *testing.T) {
	slave := &Slave{
		WireGuardIP:         "10.0.1.10",
		CaddyAdminPort:      2019,
		CaddyAdminAPIScheme: "http",
	}

	expected := "http://10.0.1.10:2019"
	actual := slave.GetAdminURL()

	if actual != expected {
		t.Errorf("Expected GetAdminURL to return %s, got %s", expected, actual)
	}
}

func TestSlaveRequestValidate(t *testing.T) {
	tests := []struct {
		name     string
		request  SlaveRequest
		expected SlaveRequest
	}{
		{
			name: "sets defaults",
			request: SlaveRequest{
				Name:        "test",
				WireGuardIP: "10.0.1.10",
			},
			expected: SlaveRequest{
				Name:                "test",
				WireGuardIP:         "10.0.1.10",
				CaddyAdminPort:      2019,
				CaddyAdminAPIScheme: "http",
				IsEnabled:           &[]bool{true}[0],
			},
		},
		{
			name: "preserves existing values",
			request: SlaveRequest{
				Name:                "test",
				WireGuardIP:         "10.0.1.10",
				CaddyAdminPort:      8080,
				CaddyAdminAPIScheme: "https",
				IsEnabled:           &[]bool{false}[0],
			},
			expected: SlaveRequest{
				Name:                "test",
				WireGuardIP:         "10.0.1.10",
				CaddyAdminPort:      8080,
				CaddyAdminAPIScheme: "https",
				IsEnabled:           &[]bool{false}[0],
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.request.Validate()
			if err != nil {
				t.Errorf("Validate() returned error: %v", err)
			}

			if tt.request.CaddyAdminPort != tt.expected.CaddyAdminPort {
				t.Errorf("Expected CaddyAdminPort to be %d, got %d", tt.expected.CaddyAdminPort, tt.request.CaddyAdminPort)
			}

			if tt.request.CaddyAdminAPIScheme != tt.expected.CaddyAdminAPIScheme {
				t.Errorf("Expected CaddyAdminAPIScheme to be %s, got %s", tt.expected.CaddyAdminAPIScheme, tt.request.CaddyAdminAPIScheme)
			}

			if *tt.request.IsEnabled != *tt.expected.IsEnabled {
				t.Errorf("Expected IsEnabled to be %v, got %v", *tt.expected.IsEnabled, *tt.request.IsEnabled)
			}
		})
	}
}

func TestGenerateVersionID(t *testing.T) {
	testTime := time.Date(2023, 12, 25, 15, 30, 45, 0, time.UTC)
	expected := "20231225-153045"
	actual := generateVersionID(testTime)

	if actual != expected {
		t.Errorf("Expected generateVersionID to return %s, got %s", expected, actual)
	}
}
