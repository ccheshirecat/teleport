package api

import (
	"fmt"
	"net/http"
	"teleport/internal/models"
	"teleport/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Handlers contains all API handlers
type Handlers struct {
	configService *service.ConfigurationService
	slaveService  *service.SlaveService
	caddyService  *service.CaddyService
	logger        *logrus.Logger
}

// NewHandlers creates a new handlers instance
func NewHandlers(
	configService *service.ConfigurationService,
	slaveService *service.SlaveService,
	caddyService *service.CaddyService,
	logger *logrus.Logger,
) *Handlers {
	return &Handlers{
		configService: configService,
		slaveService:  slaveService,
		caddyService:  caddyService,
		logger:        logger,
	}
}

// GetActiveConfiguration returns the current active configuration
func (h *Handlers) GetActiveConfiguration(c *gin.Context) {
	config, err := h.configService.GetActiveConfiguration()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get active configuration")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active configuration"})
		return
	}

	if config == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active configuration found"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// SetActiveConfiguration sets a new active configuration
func (h *Handlers) SetActiveConfiguration(c *gin.Context) {
	var req models.ConfigurationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Set the new active configuration
	config, err := h.configService.SetActiveConfiguration(req.JSONConfig, req.Description)
	if err != nil {
		h.logger.WithError(err).Error("Failed to set active configuration")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set active configuration"})
		return
	}

	// Trigger sync to all enabled slaves asynchronously
	go func() {
		results, err := h.caddyService.SyncConfigurationToAllSlaves(config, h.slaveService)
		if err != nil {
			h.logger.WithError(err).Error("Failed to sync configuration to slaves")
			return
		}

		// Log sync results
		for _, result := range results {
			if result.Success {
				h.logger.WithFields(logrus.Fields{
					"slave_id":   result.SlaveID,
					"version_id": config.VersionID,
				}).Info("Configuration sync successful")
			} else {
				h.logger.WithFields(logrus.Fields{
					"slave_id": result.SlaveID,
					"error":    result.Message,
				}).Error("Configuration sync failed")
			}
		}
	}()

	c.JSON(http.StatusOK, config)
}

// GetConfigurationHistory returns configuration history
func (h *Handlers) GetConfigurationHistory(c *gin.Context) {
	configs, err := h.configService.GetConfigurationHistory()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get configuration history")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get configuration history"})
		return
	}

	c.JSON(http.StatusOK, configs)
}

// GetConfigurationByVersionID returns a specific configuration by version ID
func (h *Handlers) GetConfigurationByVersionID(c *gin.Context) {
	versionID := c.Param("version_id")
	if versionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Version ID is required"})
		return
	}

	config, err := h.configService.GetConfigurationByVersionID(versionID)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get configuration by version ID")
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuration not found"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// RollbackConfiguration rolls back to a specific configuration version
func (h *Handlers) RollbackConfiguration(c *gin.Context) {
	versionID := c.Param("version_id")
	if versionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Version ID is required"})
		return
	}

	config, err := h.configService.RollbackToVersion(versionID)
	if err != nil {
		h.logger.WithError(err).Error("Failed to rollback configuration")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to rollback configuration"})
		return
	}

	// Trigger sync to all enabled slaves asynchronously
	go func() {
		results, err := h.caddyService.SyncConfigurationToAllSlaves(config, h.slaveService)
		if err != nil {
			h.logger.WithError(err).Error("Failed to sync rollback configuration to slaves")
			return
		}

		// Log sync results
		for _, result := range results {
			if result.Success {
				h.logger.WithFields(logrus.Fields{
					"slave_id":   result.SlaveID,
					"version_id": config.VersionID,
				}).Info("Rollback configuration sync successful")
			} else {
				h.logger.WithFields(logrus.Fields{
					"slave_id": result.SlaveID,
					"error":    result.Message,
				}).Error("Rollback configuration sync failed")
			}
		}
	}()

	c.JSON(http.StatusOK, config)
}

// GetAllSlaves returns all slaves
func (h *Handlers) GetAllSlaves(c *gin.Context) {
	slaves, err := h.slaveService.GetAllSlaves()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get slaves")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get slaves"})
		return
	}

	c.JSON(http.StatusOK, slaves)
}

// CreateSlave creates a new slave
func (h *Handlers) CreateSlave(c *gin.Context) {
	var req models.SlaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	slave, err := h.slaveService.CreateSlave(&req)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create slave")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create slave"})
		return
	}

	// If slave is enabled, sync current active configuration
	if slave.IsEnabled {
		go func() {
			activeConfig, err := h.configService.GetActiveConfiguration()
			if err != nil {
				h.logger.WithError(err).Error("Failed to get active configuration for new slave sync")
				return
			}

			if activeConfig != nil {
				result := h.caddyService.SyncConfigurationToSlave(slave, activeConfig, h.slaveService)
				if result.Success {
					h.logger.WithFields(logrus.Fields{
						"slave_id":   slave.ID,
						"version_id": activeConfig.VersionID,
					}).Info("Initial configuration sync to new slave successful")
				} else {
					h.logger.WithFields(logrus.Fields{
						"slave_id": slave.ID,
						"error":    result.Message,
					}).Error("Initial configuration sync to new slave failed")
				}
			}
		}()
	}

	c.JSON(http.StatusCreated, slave)
}

// GetSlaveByID returns a specific slave
func (h *Handlers) GetSlaveByID(c *gin.Context) {
	id := c.Param("slave_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Slave ID is required"})
		return
	}

	slave, err := h.slaveService.GetSlaveByID(id)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get slave by ID")
		c.JSON(http.StatusNotFound, gin.H{"error": "Slave not found"})
		return
	}

	c.JSON(http.StatusOK, slave)
}

// UpdateSlave updates an existing slave
func (h *Handlers) UpdateSlave(c *gin.Context) {
	id := c.Param("slave_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Slave ID is required"})
		return
	}

	var req models.SlaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	slave, err := h.slaveService.UpdateSlave(id, &req)
	if err != nil {
		h.logger.WithError(err).Error("Failed to update slave")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update slave"})
		return
	}

	c.JSON(http.StatusOK, slave)
}

// DeleteSlave deletes a slave
func (h *Handlers) DeleteSlave(c *gin.Context) {
	id := c.Param("slave_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Slave ID is required"})
		return
	}

	if err := h.slaveService.DeleteSlave(id); err != nil {
		h.logger.WithError(err).Error("Failed to delete slave")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete slave"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Slave deleted successfully"})
}

// SyncSlaveConfiguration forces a sync of current configuration to a specific slave
func (h *Handlers) SyncSlaveConfiguration(c *gin.Context) {
	id := c.Param("slave_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Slave ID is required"})
		return
	}

	slave, err := h.slaveService.GetSlaveByID(id)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get slave for sync")
		c.JSON(http.StatusNotFound, gin.H{"error": "Slave not found"})
		return
	}

	activeConfig, err := h.configService.GetActiveConfiguration()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get active configuration for sync")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active configuration"})
		return
	}

	if activeConfig == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active configuration found"})
		return
	}

	// Perform sync
	result := h.caddyService.SyncConfigurationToSlave(slave, activeConfig, h.slaveService)

	if result.Success {
		c.JSON(http.StatusOK, gin.H{
			"message": "Configuration sync successful",
			"result":  result,
		})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Configuration sync failed",
			"result": result,
		})
	}
}

// SyncAllSlaves forces a sync of current configuration to all enabled slaves
func (h *Handlers) SyncAllSlaves(c *gin.Context) {
	activeConfig, err := h.configService.GetActiveConfiguration()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get active configuration for sync")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active configuration"})
		return
	}

	if activeConfig == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active configuration found"})
		return
	}

	// Perform sync to all slaves
	results, err := h.caddyService.SyncConfigurationToAllSlaves(activeConfig, h.slaveService)
	if err != nil {
		h.logger.WithError(err).Error("Failed to sync configuration to all slaves")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync configuration to slaves"})
		return
	}

	// Count successes and failures
	successCount := 0
	failureCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		} else {
			failureCount++
		}
	}

	// Log sync results
	for _, result := range results {
		if result.Success {
			h.logger.WithFields(logrus.Fields{
				"slave_id":   result.SlaveID,
				"version_id": activeConfig.VersionID,
			}).Info("Manual configuration sync successful")
		} else {
			h.logger.WithFields(logrus.Fields{
				"slave_id": result.SlaveID,
				"error":    result.Message,
			}).Error("Manual configuration sync failed")
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       fmt.Sprintf("Sync completed: %d successful, %d failed", successCount, failureCount),
		"results":       results,
		"success_count": successCount,
		"failure_count": failureCount,
	})
}

// GetStatus returns overall system status
func (h *Handlers) GetStatus(c *gin.Context) {
	slaves, err := h.slaveService.GetAllSlaves()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get slaves for status")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get system status"})
		return
	}

	activeConfig, err := h.configService.GetActiveConfiguration()
	if err != nil {
		h.logger.WithError(err).Error("Failed to get active configuration for status")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get system status"})
		return
	}

	status := gin.H{
		"active_configuration": activeConfig,
		"total_slaves":         len(slaves),
		"enabled_slaves":       0,
		"slaves_in_sync":       0,
		"slaves_with_errors":   0,
	}

	for _, slave := range slaves {
		if slave.IsEnabled {
			status["enabled_slaves"] = status["enabled_slaves"].(int) + 1

			if slave.LastSyncStatus == "success" {
				status["slaves_in_sync"] = status["slaves_in_sync"].(int) + 1
			} else if slave.LastSyncStatus == "error" {
				status["slaves_with_errors"] = status["slaves_with_errors"].(int) + 1
			}
		}
	}

	c.JSON(http.StatusOK, status)
}
