#!/bin/bash
# Start Next.js dev server with PostgreSQL via Docker Compose.

echo "⏳ Ensuring PostgreSQL is running..."
docker compose up -d --wait db

echo "🚀 Starting Next.js development server..."
next dev -H 0.0.0.0
