#!/bin/bash

# Debug script for Go build issues

echo "=== Go Build Debug Information ==="
echo ""

echo "1. Current directory:"
pwd
echo ""

echo "2. Go version:"
go version
echo ""

echo "3. Go environment:"
go env GOPATH
go env GOROOT
go env GOMOD
go env GO111MODULE
echo ""

echo "4. Directory contents:"
ls -la
echo ""

echo "5. Go module info:"
if [ -f "go.mod" ]; then
    echo "go.mod exists:"
    cat go.mod
    echo ""
    
    echo "go.sum exists:"
    if [ -f "go.sum" ]; then
        echo "Yes"
    else
        echo "No"
    fi
    echo ""
else
    echo "go.mod does not exist!"
    echo ""
fi

echo "6. Main file check:"
if [ -f "cmd/teleport/main.go" ]; then
    echo "cmd/teleport/main.go exists ✓"
    echo "First few lines:"
    head -10 cmd/teleport/main.go
else
    echo "cmd/teleport/main.go does not exist ✗"
fi
echo ""

echo "7. Testing build command:"
echo "Command: go build -o test-teleport ./cmd/teleport/main.go"
if go build -o test-teleport ./cmd/teleport/main.go; then
    echo "✓ Build successful!"
    ls -la test-teleport
    rm -f test-teleport
else
    echo "✗ Build failed!"
fi
echo ""

echo "8. Alternative build test:"
echo "Command: go build -o test-teleport cmd/teleport/main.go"
if go build -o test-teleport cmd/teleport/main.go; then
    echo "✓ Alternative build successful!"
    ls -la test-teleport
    rm -f test-teleport
else
    echo "✗ Alternative build failed!"
fi
echo ""

echo "9. Go mod tidy check:"
if go mod tidy; then
    echo "✓ go mod tidy successful"
else
    echo "✗ go mod tidy failed"
fi
echo ""

echo "=== Debug Complete ==="
