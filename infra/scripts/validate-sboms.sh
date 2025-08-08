#!/bin/bash
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(pwd)
SBOM_DIR="sboms"

if [ "$REPO_ROOT" != "$CURRENT_DIR" ]; then
    echo "Skipping hook because it's not run from repo root."
    exit 0
fi

echo "--- Starting SBOM Validation Process ---"

############################################
# Check command and dir, exit if not found #
############################################

echo "▶️  Checking for required command: grype..."
if ! command -v grype >/dev/null 2>&1; then
    echo "❌ Error: 'grype' is not installed or not in PATH."
    exit 1
fi
echo "✅ grype is present."

if [ ! -d "$SBOM_DIR" ]; then
    echo "❌ Error: Directory './${SBOM_DIR}' not found. Please run the generation script first."
    exit 1
fi

##################################################
# Validate SBOM files in the specified directory #
##################################################

echo "▶️  Scanning for SBOM files in ./${SBOM_DIR}..."

# Validate and Analyze each SBOM file in the directory
for sbom_file in "${SBOM_DIR}"/*.json; do
    if [ -f "$sbom_file" ]; then
        echo "    -> Validating file: $(basename "$sbom_file")"
        file_path=$(realpath "$sbom_file")
        grype sbom:$file_path
    fi
done

echo ""
echo "--- 🎉 All SBOM files in ./${SBOM_DIR} are valid! ---"