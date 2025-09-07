package service

import (
	"database/sql"
	"fmt"
	"teleport/internal/models"

	"github.com/sirupsen/logrus"
)

// ConfigurationService handles configuration-related operations
type ConfigurationService struct {
	db     *sql.DB
	logger *logrus.Logger
}

// NewConfigurationService creates a new configuration service
func NewConfigurationService(db *sql.DB, logger *logrus.Logger) *ConfigurationService {
	return &ConfigurationService{
		db:     db,
		logger: logger,
	}
}

// GetActiveConfiguration returns the currently active configuration
func (cs *ConfigurationService) GetActiveConfiguration() (*models.Configuration, error) {
	query := `
		SELECT id, version_id, json_config, description, created_at, is_active
		FROM configurations
		WHERE is_active = TRUE
		LIMIT 1
	`

	var config models.Configuration
	err := cs.db.QueryRow(query).Scan(
		&config.ID,
		&config.VersionID,
		&config.JSONConfig,
		&config.Description,
		&config.CreatedAt,
		&config.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No active configuration
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get active configuration: %w", err)
	}

	return &config, nil
}

// SetActiveConfiguration sets a new active configuration
func (cs *ConfigurationService) SetActiveConfiguration(jsonConfig, description string) (*models.Configuration, error) {
	tx, err := cs.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Deactivate current active configuration
	if _, err := tx.Exec("UPDATE configurations SET is_active = FALSE WHERE is_active = TRUE"); err != nil {
		return nil, fmt.Errorf("failed to deactivate current configuration: %w", err)
	}

	// Create new configuration
	config := models.NewConfiguration(jsonConfig, description)
	config.IsActive = true

	// Insert new configuration
	insertQuery := `
		INSERT INTO configurations (id, version_id, json_config, description, created_at, is_active)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err = tx.Exec(insertQuery,
		config.ID,
		config.VersionID,
		config.JSONConfig,
		config.Description,
		config.CreatedAt,
		config.IsActive,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert new configuration: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	cs.logger.WithFields(logrus.Fields{
		"config_id":   config.ID,
		"version_id":  config.VersionID,
		"description": config.Description,
	}).Info("New active configuration set")

	return config, nil
}

// GetConfigurationHistory returns all configurations ordered by creation date
func (cs *ConfigurationService) GetConfigurationHistory() ([]*models.Configuration, error) {
	query := `
		SELECT id, version_id, json_config, description, created_at, is_active
		FROM configurations
		ORDER BY created_at DESC
	`

	rows, err := cs.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query configuration history: %w", err)
	}
	defer rows.Close()

	var configs []*models.Configuration
	for rows.Next() {
		var config models.Configuration
		err := rows.Scan(
			&config.ID,
			&config.VersionID,
			&config.JSONConfig,
			&config.Description,
			&config.CreatedAt,
			&config.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan configuration: %w", err)
		}
		configs = append(configs, &config)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating configuration rows: %w", err)
	}

	return configs, nil
}

// GetConfigurationByVersionID returns a configuration by its version ID
func (cs *ConfigurationService) GetConfigurationByVersionID(versionID string) (*models.Configuration, error) {
	query := `
		SELECT id, version_id, json_config, description, created_at, is_active
		FROM configurations
		WHERE version_id = ?
	`

	var config models.Configuration
	err := cs.db.QueryRow(query, versionID).Scan(
		&config.ID,
		&config.VersionID,
		&config.JSONConfig,
		&config.Description,
		&config.CreatedAt,
		&config.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("configuration with version ID %s not found", versionID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get configuration by version ID: %w", err)
	}

	return &config, nil
}

// RollbackToVersion sets a historical configuration as the new active configuration
func (cs *ConfigurationService) RollbackToVersion(versionID string) (*models.Configuration, error) {
	// Get the historical configuration
	historicalConfig, err := cs.GetConfigurationByVersionID(versionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get historical configuration: %w", err)
	}

	// Create a new configuration with the same JSON but new version ID
	newConfig, err := cs.SetActiveConfiguration(
		historicalConfig.JSONConfig,
		fmt.Sprintf("Rollback to version %s", versionID),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to set rollback configuration: %w", err)
	}

	cs.logger.WithFields(logrus.Fields{
		"rollback_from_version": versionID,
		"new_version_id":        newConfig.VersionID,
	}).Info("Configuration rolled back")

	return newConfig, nil
}
