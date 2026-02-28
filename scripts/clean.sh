#!/bin/bash
# scripts/clean.sh

echo "🧹 Cleaning up Docker resources..."
docker-compose down -v
docker system prune -f
echo "✅ Cleaned"