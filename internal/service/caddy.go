package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"teleport/internal/models"
	"time"

	"github.com/sirupsen/logrus"
)

// CaddyService handles communication with Caddy instances
type CaddyService struct {
	client *http.Client
	logger *logrus.Logger
}

// NewCaddyService creates a new Caddy service
func NewCaddyService(logger *logrus.Logger) *CaddyService {
	return &CaddyService{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// PushConfiguration pushes a configuration to a Caddy instance
func (cs *CaddyService) PushConfiguration(slave *models.Slave, jsonConfig string) error {
	url := fmt.Sprintf("%s/load", slave.GetAdminURL())

	// Validate JSON before sending
	var configData any
	if err := json.Unmarshal([]byte(jsonConfig), &configData); err != nil {
		return fmt.Errorf("invalid JSON configuration: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(jsonConfig))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Add timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	cs.logger.WithFields(logrus.Fields{
		"slave_id":   slave.ID,
		"slave_name": slave.Name,
		"url":        url,
	}).Debug("Pushing configuration to Caddy instance")

	// Send request
	resp, err := cs.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request to Caddy: %w", err)
	}
	defer resp.Body.Close()

	// Read response body for error details
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Caddy returned status %d: %s", resp.StatusCode, string(body))
	}

	cs.logger.WithFields(logrus.Fields{
		"slave_id":   slave.ID,
		"slave_name": slave.Name,
	}).Info("Configuration successfully pushed to Caddy instance")

	return nil
}

// GetConfiguration retrieves the current configuration from a Caddy instance
func (cs *CaddyService) GetConfiguration(slave *models.Slave) (string, error) {
	url := fmt.Sprintf("%s/config/", slave.GetAdminURL())

	// Create request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Add timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	cs.logger.WithFields(logrus.Fields{
		"slave_id":   slave.ID,
		"slave_name": slave.Name,
		"url":        url,
	}).Debug("Retrieving configuration from Caddy instance")

	// Send request
	resp, err := cs.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request to Caddy: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Caddy returned status %d: %s", resp.StatusCode, string(body))
	}

	// Validate that response is valid JSON
	var configData any
	if err := json.Unmarshal(body, &configData); err != nil {
		return "", fmt.Errorf("Caddy returned invalid JSON: %w", err)
	}

	return string(body), nil
}

// TestConnection tests connectivity to a Caddy instance
func (cs *CaddyService) TestConnection(slave *models.Slave) error {
	url := fmt.Sprintf("%s/config/", slave.GetAdminURL())

	// Create request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add short timeout for connection test
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	// Send request
	resp, err := cs.client.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	// We don't care about the response content, just that we can connect
	if resp.StatusCode >= 500 {
		return fmt.Errorf("Caddy server error: status %d", resp.StatusCode)
	}

	return nil
}

// SyncConfigurationToSlave synchronizes configuration to a single slave
func (cs *CaddyService) SyncConfigurationToSlave(slave *models.Slave, config *models.Configuration, slaveService *SlaveService) *models.SyncResult {
	result := &models.SyncResult{
		SlaveID:   slave.ID,
		Timestamp: time.Now(),
	}

	cs.logger.WithFields(logrus.Fields{
		"slave_id":   slave.ID,
		"slave_name": slave.Name,
		"version_id": config.VersionID,
	}).Info("Starting configuration sync to slave")

	// Update status to syncing
	slaveService.UpdateSyncStatus(slave.ID, "syncing", "Synchronization in progress")

	// Push configuration
	if err := cs.PushConfiguration(slave, config.JSONConfig); err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to push configuration: %v", err)

		// Update status to error
		slaveService.UpdateSyncStatus(slave.ID, "error", result.Message)

		cs.logger.WithFields(logrus.Fields{
			"slave_id":   slave.ID,
			"slave_name": slave.Name,
			"error":      err,
		}).Error("Failed to sync configuration to slave")

		return result
	}

	// Update slave with successful sync
	result.Success = true
	result.Message = "Configuration synchronized successfully"

	slaveService.UpdateSyncStatus(slave.ID, "success", result.Message)
	slaveService.UpdateLastKnownConfigVersion(slave.ID, config.VersionID)

	cs.logger.WithFields(logrus.Fields{
		"slave_id":   slave.ID,
		"slave_name": slave.Name,
		"version_id": config.VersionID,
	}).Info("Configuration successfully synced to slave")

	return result
}

// SyncConfigurationToAllSlaves synchronizes configuration to all enabled slaves
func (cs *CaddyService) SyncConfigurationToAllSlaves(config *models.Configuration, slaveService *SlaveService) ([]*models.SyncResult, error) {
	slaves, err := slaveService.GetEnabledSlaves()
	if err != nil {
		return nil, fmt.Errorf("failed to get enabled slaves: %w", err)
	}

	if len(slaves) == 0 {
		cs.logger.Info("No enabled slaves found for synchronization")
		return []*models.SyncResult{}, nil
	}

	cs.logger.WithFields(logrus.Fields{
		"version_id":  config.VersionID,
		"slave_count": len(slaves),
	}).Info("Starting configuration sync to all enabled slaves")

	// Create a channel to collect results
	resultChan := make(chan *models.SyncResult, len(slaves))

	// Start goroutines for each slave
	for _, slave := range slaves {
		go func(s *models.Slave) {
			result := cs.SyncConfigurationToSlave(s, config, slaveService)
			resultChan <- result
		}(slave)
	}

	// Collect all results
	var results []*models.SyncResult
	for i := 0; i < len(slaves); i++ {
		result := <-resultChan
		results = append(results, result)
	}

	// Log summary
	successCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		}
	}

	cs.logger.WithFields(logrus.Fields{
		"version_id":    config.VersionID,
		"total_slaves":  len(slaves),
		"success_count": successCount,
		"failure_count": len(slaves) - successCount,
	}).Info("Configuration sync completed")

	return results, nil
}
