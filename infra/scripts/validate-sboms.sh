#!/bin/bash
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(pwd)

if [ "$REPO_ROOT" != "$CURRENT_DIR" ]; then
    echo "Skipping hook because it's not run from repo root."
    exit 0
fi

SBOM_FILE="${CURRENT_DIR}/sbom-workspace.json"
echo "--- Starting SBOM Validation Process ---"

echo "▶️  Checking for required command: grype..."
if ! command -v grype >/dev/null 2>&1; then
    echo "❌ Error: 'grype' is not installed or not in PATH."
    exit 1
fi
echo "✅ grype is present."

if [ ! -f "$SBOM_FILE" ]; then
    echo "❌ Error: SBOM file '${SBOM_FILE}' not found. Please run the generation script first."
    exit 1
fi

echo "▶️  Scanning for SBOM file..."
grype sbom:$SBOM_FILE

echo ""
echo "--- 🎉 All SBOM files in ./${SBOM_FILE} are valid! ---"