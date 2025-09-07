package config

import (
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config represents the application configuration
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Logging  LoggingConfig  `mapstructure:"logging"`
}

// ServerConfig contains server-related configuration
type ServerConfig struct {
	Host string `mapstructure:"host"` // IP address to bind to (empty = all interfaces)
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"` // "development" or "production"
}

// DatabaseConfig contains database-related configuration
type DatabaseConfig struct {
	Path string `mapstructure:"path"`
}

// LoggingConfig contains logging-related configuration
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"` // "json" or "text"
}

// Load loads configuration from file and environment variables
func Load(configFile string) (*Config, error) {
	// Set defaults
	viper.SetDefault("server.host", "") // Empty = bind to all interfaces
	viper.SetDefault("server.port", 3333)
	viper.SetDefault("server.mode", "development")
	viper.SetDefault("database.path", "./teleport.db")
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "json")

	// Set config file
	if configFile != "" {
		viper.SetConfigFile(configFile)
	} else {
		// Look for config in current directory
		viper.AddConfigPath(".")
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
	}

	// Environment variables
	viper.SetEnvPrefix("TELEPORT")
	viper.AutomaticEnv()

	// Read config file if it exists
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
		// Config file not found, use defaults and env vars
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	// Ensure database directory exists
	dbDir := filepath.Dir(config.Database.Path)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, err
	}

	return &config, nil
}
