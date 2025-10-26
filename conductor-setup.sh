#!/bin/bash
set -e

echo "🔧 Setting up workspace..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed."
    echo "Please install Bun from https://bun.sh"
    exit 1
fi

echo "✓ Bun is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Copy .env.local from repository root if it exists
if [ -f "$CONDUCTOR_ROOT_PATH/.env.local" ]; then
    echo "📋 Copying .env.local from repository root..."
    cp "$CONDUCTOR_ROOT_PATH/.env.local" .env.local
    echo "✓ Environment variables copied"
else
    echo "⚠️  Warning: No .env.local file found in repository root"
    echo "Please create $CONDUCTOR_ROOT_PATH/.env.local with your LiveKit credentials"
fi

echo "✅ Setup complete!"
