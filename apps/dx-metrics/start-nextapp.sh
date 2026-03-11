#!/bin/bash
# Start Next.js dev server with proper environment variables

# Check if PostgreSQL is running
if ! docker ps | grep -q dx-metrics-db-1; then
    echo "⚠️  PostgreSQL is not running. Starting it..."
    docker-compose up -d db
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 3
fi

echo "🚀 Starting Next.js development server..."
next dev -H 0.0.0.0
