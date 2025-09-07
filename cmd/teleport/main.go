package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"teleport/internal/api"
	"teleport/internal/config"
	"teleport/internal/database"
	"teleport/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	configFile string
	host       string
	port       int
	dbPath     string
)

// startWebUI starts the Remix web UI using bun
func startWebUI(logger *logrus.Logger) *exec.Cmd {
	// Check if web directory exists
	webDir := "web"
	if _, err := os.Stat(webDir); os.IsNotExist(err) {
		logger.Warn("Web directory not found, web UI will not be available")
		return nil
	}

	// Check if bun is available - try system bun first
	bunPath := "bun"
	if _, err := exec.LookPath("bun"); err != nil {
		// Try local bun installation
		localBunPath := "/root/.bun/bin/bun"
		if _, err := os.Stat(localBunPath); os.IsNotExist(err) {
			logger.Warn("Bun not found, web UI will not be available")
			return nil
		}
		bunPath = localBunPath
	}

	// Start bun remix serve
	cmd := exec.Command(bunPath, "run", "start", "--host", "0.0.0.0", "--port", "5173")
	cmd.Dir = webDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		logger.WithError(err).Error("Failed to start web UI")
		return nil
	}

	logger.Info("Web UI started on port 5173")
	return cmd
}

func main() {
	var rootCmd = &cobra.Command{
		Use:   "teleport",
		Short: "Teleport Caddy Controller - Centralized management for Caddy instances",
		Long: `Teleport (TCC) provides centralized management for a fleet of Caddy instances
acting as reverse proxies on anycast edge nodes, enabling dynamic configuration
updates, versioning, and rollback capabilities.`,
		Run: runServer,
	}

	rootCmd.Flags().StringVarP(&configFile, "config", "c", "", "config file (default is ./config.yaml)")
	rootCmd.Flags().StringVar(&host, "host", "", "IP address to bind to (default is all interfaces)")
	rootCmd.Flags().IntVarP(&port, "port", "p", 3333, "port to run the server on")
	rootCmd.Flags().StringVarP(&dbPath, "database", "d", "./teleport.db", "path to SQLite database file")

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func runServer(cmd *cobra.Command, args []string) {
	// Initialize logger
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(logrus.InfoLevel)

	// Load configuration
	cfg, err := config.Load(configFile)
	if err != nil {
		logger.WithError(err).Fatal("Failed to load configuration")
	}

	// Override config with CLI flags if provided
	if host != "" {
		cfg.Server.Host = host
	}
	if port != 3333 {
		cfg.Server.Port = port
	}
	if dbPath != "./teleport.db" {
		cfg.Database.Path = dbPath
	}

	// Initialize database
	db, err := database.Initialize(cfg.Database.Path)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize database")
	}
	defer db.Close()

	// Run migrations
	if err := database.Migrate(db); err != nil {
		logger.WithError(err).Fatal("Failed to run database migrations")
	}

	// Initialize services
	configService := service.NewConfigurationService(db, logger)
	slaveService := service.NewSlaveService(db, logger)
	caddyService := service.NewCaddyService(logger)

	// Initialize API handlers
	apiHandlers := api.NewHandlers(configService, slaveService, caddyService, logger)

	// Setup Gin router
	if cfg.Server.Mode == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Setup CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Setup API routes
	api.SetupRoutes(router, apiHandlers)

	// Start web UI subprocess
	webCmd := startWebUI(logger)
	if webCmd != nil {
		defer func() {
			if webCmd.Process != nil {
				webCmd.Process.Kill()
			}
		}()
	}

	// Proxy all non-API routes to the Remix server
	router.NoRoute(func(c *gin.Context) {
		// Don't proxy API routes
		if strings.HasPrefix(c.Request.URL.Path, "/api/") || strings.HasPrefix(c.Request.URL.Path, "/health") {
			c.JSON(404, gin.H{"error": "Not found"})
			return
		}

		// Proxy to Remix server on port 5173
		target, _ := url.Parse("http://localhost:5173")
		proxy := httputil.NewSingleHostReverseProxy(target)
		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// Setup server
	listenAddr := fmt.Sprintf(":%d", cfg.Server.Port)
	if cfg.Server.Host != "" {
		listenAddr = fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	}

	srv := &http.Server{
		Addr:    listenAddr,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		logger.WithField("port", cfg.Server.Port).Info("Starting Teleport server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Failed to start server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.WithError(err).Fatal("Server forced to shutdown")
	}

	logger.Info("Server exited")
}
