package web

import (
	"embed"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Embed the built web assets
//
//go:embed dist/*
var webFS embed.FS

// GetWebFS returns the embedded web filesystem
func GetWebFS() (fs.FS, error) {
	// Try to access a test file to see if embed worked
	if _, err := webFS.Open("dist/index.html"); err != nil {
		return nil, err
	}
	return fs.Sub(webFS, "dist")
}

// ServeEmbeddedWeb serves the embedded web UI
func ServeEmbeddedWeb(router *gin.Engine) {
	// Get the embedded filesystem
	webAssets, err := GetWebFS()
	if err != nil {
		// If no embedded assets, serve a simple message
		router.GET("/", func(c *gin.Context) {
			c.HTML(http.StatusOK, "", `
<!DOCTYPE html>
<html>
<head>
    <title>Teleport - Caddy Controller</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1e293b; margin-bottom: 20px; }
        .status { color: #059669; font-weight: 600; }
        .api-links { margin-top: 30px; }
        .api-links a { display: block; margin: 10px 0; color: #0ea5e9; text-decoration: none; }
        .api-links a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Teleport Caddy Controller</h1>
        <p class="status">✅ API Server Running</p>
        <p>The Teleport API is running successfully. The web UI will be available once built and embedded.</p>

        <div class="api-links">
            <h3>API Endpoints:</h3>
            <a href="/health">Health Check</a>
            <a href="/api/v1/status">System Status</a>
            <a href="/api/v1/slaves">Slave List</a>
            <a href="/api/v1/configurations/active">Active Configuration</a>
            <a href="/api/v1/configurations/history">Configuration History</a>
        </div>

        <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            To build and embed the web UI, run: <code>make build-web</code>
        </p>
    </div>
</body>
</html>`)
		})
		return
	}

	// Serve embedded web assets
	httpFS := http.FS(webAssets)

	// Handle static assets
	router.StaticFS("/assets", httpFS)

	// Handle SPA routing - serve index.html for all non-API routes
	router.NoRoute(func(c *gin.Context) {
		// Skip API routes
		if strings.HasPrefix(c.Request.URL.Path, "/api/") ||
			strings.HasPrefix(c.Request.URL.Path, "/health") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}

		// Try to serve the requested file
		requestedPath := c.Request.URL.Path
		if requestedPath == "/" {
			requestedPath = "/index.html"
		}

		// Clean the path
		cleanPath := path.Clean(requestedPath)
		if strings.HasPrefix(cleanPath, "/") {
			cleanPath = cleanPath[1:]
		}

		// Try to open the file
		file, err := webAssets.Open(cleanPath)
		if err != nil {
			// File not found, serve index.html for SPA routing
			indexFile, indexErr := webAssets.Open("index.html")
			if indexErr != nil {
				c.String(http.StatusNotFound, "Web UI not found")
				return
			}
			defer indexFile.Close()

			c.Header("Content-Type", "text/html")
			http.ServeContent(c.Writer, c.Request, "index.html", time.Time{}, indexFile.(io.ReadSeeker))
			return
		}
		defer file.Close()

		// Determine content type
		contentType := "text/plain"
		if strings.HasSuffix(cleanPath, ".html") {
			contentType = "text/html"
		} else if strings.HasSuffix(cleanPath, ".css") {
			contentType = "text/css"
		} else if strings.HasSuffix(cleanPath, ".js") {
			contentType = "application/javascript"
		} else if strings.HasSuffix(cleanPath, ".json") {
			contentType = "application/json"
		}

		c.Header("Content-Type", contentType)
		http.ServeContent(c.Writer, c.Request, cleanPath, time.Time{}, file.(io.ReadSeeker))
	})
}
