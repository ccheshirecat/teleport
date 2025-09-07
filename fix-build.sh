#!/bin/bash

# Fix common Go build issues for Teleport

set -e

echo "=== Teleport Build Fix Script ==="
echo ""

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo "❌ Error: go.mod not found. Please run this script from the teleport project root."
    exit 1
fi

if [ ! -f "cmd/teleport/main.go" ]; then
    echo "❌ Error: cmd/teleport/main.go not found. Please run this script from the teleport project root."
    exit 1
fi

echo "✅ Found go.mod and main.go files"
echo ""

echo "🔧 Step 1: Cleaning Go module cache..."
go clean -modcache || true
echo ""

echo "🔧 Step 2: Tidying Go modules..."
go mod tidy
echo ""

echo "🔧 Step 3: Downloading dependencies..."
go mod download
echo ""

echo "🔧 Step 4: Verifying dependencies..."
go mod verify
echo ""

echo "🔧 Step 5: Testing simple build..."
if CGO_ENABLED=1 go build -o test-teleport ./cmd/teleport/main.go; then
    echo "✅ Simple build successful!"
    rm -f test-teleport
else
    echo "❌ Simple build failed!"
    echo ""
    echo "Trying alternative approach..."
    if CGO_ENABLED=1 go build -o test-teleport cmd/teleport/main.go; then
        echo "✅ Alternative build successful!"
        rm -f test-teleport
    else
        echo "❌ Both build approaches failed!"
        echo ""
        echo "Debug information:"
        echo "Go version: $(go version)"
        echo "GOPATH: $(go env GOPATH)"
        echo "GOROOT: $(go env GOROOT)"
        echo "GO111MODULE: $(go env GO111MODULE)"
        echo ""
        echo "Please check your Go installation and module setup."
        exit 1
    fi
fi
echo ""

echo "🔧 Step 6: Testing Makefile build..."
if make build; then
    echo "✅ Makefile build successful!"
else
    echo "❌ Makefile build failed!"
    echo ""
    echo "Let's try a manual build with the exact Makefile command:"
    mkdir -p build
    if CGO_ENABLED=1 go build -ldflags "-X main.version=dev" -o build/teleport ./cmd/teleport/main.go; then
        echo "✅ Manual build with Makefile flags successful!"
    else
        echo "❌ Manual build with Makefile flags failed!"
        echo ""
        echo "Trying without ldflags..."
        if CGO_ENABLED=1 go build -o build/teleport ./cmd/teleport/main.go; then
            echo "✅ Build without ldflags successful!"
            echo "⚠️  Note: Version flag may not work, but binary builds correctly."
        else
            echo "❌ Build without ldflags also failed!"
            exit 1
        fi
    fi
fi
echo ""

echo "🔧 Step 7: Testing binary..."
if [ -f "build/teleport" ]; then
    echo "✅ Binary exists: build/teleport"
    echo "Binary info:"
    ls -la build/teleport
    echo ""
    echo "Testing help command..."
    if ./build/teleport --help; then
        echo "✅ Binary runs correctly!"
    else
        echo "❌ Binary exists but doesn't run correctly!"
        exit 1
    fi
else
    echo "❌ Binary not found after build!"
    exit 1
fi
echo ""

echo "🎉 All fixes applied successfully!"
echo ""
echo "✅ Your Teleport build is now working correctly."
echo ""
echo "Next steps:"
echo "1. Run 'make build' to build the application"
echo "2. Run 'sudo make deploy' to install as a service"
echo "3. Check the DEPLOYMENT.md guide for production setup"
