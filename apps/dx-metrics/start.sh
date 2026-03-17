#!/bin/bash
# Start Next.js dev server with PostgreSQL via Docker Compose.

echo "⏳ Ensuring PostgreSQL is running..."
docker compose --profile dx-metrics -f ../../docker-compose.yml up -d --wait postgresql

echo "🚀 Starting Next.js development server..."
pnpm dev
