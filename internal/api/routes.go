package api

import (
	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.Engine, handlers *Handlers) {
	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Configuration routes
		configurations := v1.Group("/configurations")
		{
			configurations.GET("/active", handlers.GetActiveConfiguration)
			configurations.POST("/active", handlers.SetActiveConfiguration)
			configurations.POST("/sync", handlers.SyncAllSlaves)
			configurations.GET("/history", handlers.GetConfigurationHistory)
			configurations.GET("/history/:version_id", handlers.GetConfigurationByVersionID)
			configurations.POST("/rollback/:version_id", handlers.RollbackConfiguration)
		}

		// Slave routes
		slaves := v1.Group("/slaves")
		{
			slaves.GET("", handlers.GetAllSlaves)
			slaves.POST("", handlers.CreateSlave)
			slaves.GET("/:slave_id", handlers.GetSlaveByID)
			slaves.PUT("/:slave_id", handlers.UpdateSlave)
			slaves.DELETE("/:slave_id", handlers.DeleteSlave)
			slaves.POST("/:slave_id/sync", handlers.SyncSlaveConfiguration)
		}

		// Status route
		v1.GET("/status", handlers.GetStatus)
	}
}
