package service

import (
	"database/sql"
	"fmt"
	"teleport/internal/models"
	"time"

	"github.com/sirupsen/logrus"
)

// SlaveService handles slave-related operations
type SlaveService struct {
	db     *sql.DB
	logger *logrus.Logger
}

// NewSlaveService creates a new slave service
func NewSlaveService(db *sql.DB, logger *logrus.Logger) *SlaveService {
	return &SlaveService{
		db:     db,
		logger: logger,
	}
}

// GetAllSlaves returns all slaves
func (ss *SlaveService) GetAllSlaves() ([]*models.Slave, error) {
	query := `
		SELECT id, name, wireguard_ip, caddy_admin_port, caddy_admin_api_scheme,
		       is_enabled, last_known_config_version_id, last_sync_status,
		       last_sync_message, last_sync_timestamp, added_at
		FROM slaves
		ORDER BY name
	`

	rows, err := ss.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query slaves: %w", err)
	}
	defer rows.Close()

	var slaves []*models.Slave
	for rows.Next() {
		var slave models.Slave
		err := rows.Scan(
			&slave.ID,
			&slave.Name,
			&slave.WireGuardIP,
			&slave.CaddyAdminPort,
			&slave.CaddyAdminAPIScheme,
			&slave.IsEnabled,
			&slave.LastKnownConfigVersionID,
			&slave.LastSyncStatus,
			&slave.LastSyncMessage,
			&slave.LastSyncTimestamp,
			&slave.AddedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan slave: %w", err)
		}
		slaves = append(slaves, &slave)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating slave rows: %w", err)
	}

	return slaves, nil
}

// GetSlaveByID returns a slave by its ID
func (ss *SlaveService) GetSlaveByID(id string) (*models.Slave, error) {
	query := `
		SELECT id, name, wireguard_ip, caddy_admin_port, caddy_admin_api_scheme,
		       is_enabled, last_known_config_version_id, last_sync_status,
		       last_sync_message, last_sync_timestamp, added_at
		FROM slaves
		WHERE id = ?
	`

	var slave models.Slave
	err := ss.db.QueryRow(query, id).Scan(
		&slave.ID,
		&slave.Name,
		&slave.WireGuardIP,
		&slave.CaddyAdminPort,
		&slave.CaddyAdminAPIScheme,
		&slave.IsEnabled,
		&slave.LastKnownConfigVersionID,
		&slave.LastSyncStatus,
		&slave.LastSyncMessage,
		&slave.LastSyncTimestamp,
		&slave.AddedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("slave with ID %s not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get slave by ID: %w", err)
	}

	return &slave, nil
}

// CreateSlave creates a new slave
func (ss *SlaveService) CreateSlave(req *models.SlaveRequest) (*models.Slave, error) {
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid slave request: %w", err)
	}

	slave := models.NewSlave(req.Name, req.WireGuardIP, req.CaddyAdminPort, req.CaddyAdminAPIScheme)
	slave.IsEnabled = *req.IsEnabled

	query := `
		INSERT INTO slaves (id, name, wireguard_ip, caddy_admin_port, caddy_admin_api_scheme,
		                   is_enabled, last_sync_status, last_sync_message, added_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := ss.db.Exec(query,
		slave.ID,
		slave.Name,
		slave.WireGuardIP,
		slave.CaddyAdminPort,
		slave.CaddyAdminAPIScheme,
		slave.IsEnabled,
		slave.LastSyncStatus,
		slave.LastSyncMessage,
		slave.AddedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert slave: %w", err)
	}

	ss.logger.WithFields(logrus.Fields{
		"slave_id":   slave.ID,
		"slave_name": slave.Name,
		"wg_ip":      slave.WireGuardIP,
	}).Info("New slave created")

	return slave, nil
}

// UpdateSlave updates an existing slave
func (ss *SlaveService) UpdateSlave(id string, req *models.SlaveRequest) (*models.Slave, error) {
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid slave request: %w", err)
	}

	// Check if slave exists
	existingSlave, err := ss.GetSlaveByID(id)
	if err != nil {
		return nil, err
	}

	query := `
		UPDATE slaves
		SET name = ?, wireguard_ip = ?, caddy_admin_port = ?,
		    caddy_admin_api_scheme = ?, is_enabled = ?
		WHERE id = ?
	`

	_, err = ss.db.Exec(query,
		req.Name,
		req.WireGuardIP,
		req.CaddyAdminPort,
		req.CaddyAdminAPIScheme,
		*req.IsEnabled,
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update slave: %w", err)
	}

	// Get updated slave
	updatedSlave, err := ss.GetSlaveByID(id)
	if err != nil {
		return nil, err
	}

	ss.logger.WithFields(logrus.Fields{
		"slave_id":   id,
		"slave_name": req.Name,
		"enabled":    *req.IsEnabled,
	}).Info("Slave updated")

	// If slave was disabled and is now enabled, mark for sync
	if !existingSlave.IsEnabled && *req.IsEnabled {
		ss.UpdateSyncStatus(id, "pending", "Enabled - pending sync")
	}

	return updatedSlave, nil
}

// DeleteSlave deletes a slave
func (ss *SlaveService) DeleteSlave(id string) error {
	// Check if slave exists
	_, err := ss.GetSlaveByID(id)
	if err != nil {
		return err
	}

	query := "DELETE FROM slaves WHERE id = ?"
	_, err = ss.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete slave: %w", err)
	}

	ss.logger.WithField("slave_id", id).Info("Slave deleted")
	return nil
}

// UpdateSyncStatus updates the sync status of a slave
func (ss *SlaveService) UpdateSyncStatus(slaveID, status, message string) error {
	query := `
		UPDATE slaves
		SET last_sync_status = ?, last_sync_message = ?, last_sync_timestamp = ?
		WHERE id = ?
	`

	now := time.Now()
	_, err := ss.db.Exec(query, status, message, now, slaveID)
	if err != nil {
		return fmt.Errorf("failed to update sync status: %w", err)
	}

	return nil
}

// UpdateLastKnownConfigVersion updates the last known config version for a slave
func (ss *SlaveService) UpdateLastKnownConfigVersion(slaveID, versionID string) error {
	query := `
		UPDATE slaves
		SET last_known_config_version_id = ?
		WHERE id = ?
	`

	_, err := ss.db.Exec(query, versionID, slaveID)
	if err != nil {
		return fmt.Errorf("failed to update last known config version: %w", err)
	}

	return nil
}

// GetEnabledSlaves returns all enabled slaves
func (ss *SlaveService) GetEnabledSlaves() ([]*models.Slave, error) {
	query := `
		SELECT id, name, wireguard_ip, caddy_admin_port, caddy_admin_api_scheme,
		       is_enabled, last_known_config_version_id, last_sync_status,
		       last_sync_message, last_sync_timestamp, added_at
		FROM slaves
		WHERE is_enabled = TRUE
		ORDER BY name
	`

	rows, err := ss.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query enabled slaves: %w", err)
	}
	defer rows.Close()

	var slaves []*models.Slave
	for rows.Next() {
		var slave models.Slave
		err := rows.Scan(
			&slave.ID,
			&slave.Name,
			&slave.WireGuardIP,
			&slave.CaddyAdminPort,
			&slave.CaddyAdminAPIScheme,
			&slave.IsEnabled,
			&slave.LastKnownConfigVersionID,
			&slave.LastSyncStatus,
			&slave.LastSyncMessage,
			&slave.LastSyncTimestamp,
			&slave.AddedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan slave: %w", err)
		}
		slaves = append(slaves, &slave)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating enabled slave rows: %w", err)
	}

	return slaves, nil
}
