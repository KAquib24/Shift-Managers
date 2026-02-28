#!/bin/bash
# scripts/start.sh

echo "🚀 Starting Workforce Management System..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start containers
echo "📦 Building and starting containers..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show logs
echo "📋 Showing logs (Ctrl+C to stop watching)..."
docker-compose logs -f