package database

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

// Initialize creates and returns a new database connection
func Initialize(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	return db, nil
}

// Migrate runs database migrations
func Migrate(db *sql.DB) error {
	migrations := []string{
		createConfigurationsTable,
		createSlavesTable,
		createIndexes,
	}

	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("failed to run migration %d: %w", i+1, err)
		}
	}

	return nil
}

const createConfigurationsTable = `
CREATE TABLE IF NOT EXISTS configurations (
    id TEXT PRIMARY KEY,
    version_id TEXT UNIQUE NOT NULL,
    json_config TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);`

const createSlavesTable = `
CREATE TABLE IF NOT EXISTS slaves (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    wireguard_ip TEXT NOT NULL,
    caddy_admin_port INTEGER NOT NULL DEFAULT 2019,
    caddy_admin_api_scheme TEXT NOT NULL DEFAULT 'http',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_known_config_version_id TEXT,
    last_sync_status TEXT NOT NULL DEFAULT 'pending',
    last_sync_message TEXT NOT NULL DEFAULT '',
    last_sync_timestamp DATETIME,
    added_at DATETIME NOT NULL,
    FOREIGN KEY (last_known_config_version_id) REFERENCES configurations(version_id)
);`

const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_configurations_is_active ON configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_configurations_created_at ON configurations(created_at);
CREATE INDEX IF NOT EXISTS idx_slaves_is_enabled ON slaves(is_enabled);
CREATE INDEX IF NOT EXISTS idx_slaves_last_sync_status ON slaves(last_sync_status);
`
