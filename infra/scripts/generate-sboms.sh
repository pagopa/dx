#!/bin/bash
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(pwd)

# Default value "owned-by-package"
# Ref.: https://github.com/anchore/syft/wiki/file-selection
export SYFT_FILE_METADATA_SELECTION="none"

if [ "$REPO_ROOT" != "$CURRENT_DIR" ]; then
    echo "Skipping hook because it's not run from repo root."
    exit 0
fi

OUTPUT_DIR="."
echo "--- Starting SBOM generation for the dx repository ---"

echo "▶️  Checking for required commands (syft, terraform, jq)..."
# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check each command and exit if not found
if ! command_exists syft; then
    echo "❌ Error: 'syft' is not installed or not in PATH. Please install it."
    exit 1
fi
if ! command_exists terraform; then
    echo "❌ Error: 'terraform' is not installed or not in PATH. Please install it."
    exit 1
fi
if ! command_exists jq; then
    echo "❌ Error: 'jq' is not installed or not in PATH. Please install it."
    exit 1
fi
echo "✅ All required commands are present."

#####################################################################################
# Generate SBOM for Node.js (pnpm) dependencies, Go providers and Terraform modules #
#####################################################################################

echo "▶️  Generating SBOM for Node.js (pnpm) dependencies, Go providers in ./providers/ and Terraform modules in ./infra/modules/ ..."

output_filename="${OUTPUT_DIR}/sbom-workspace.json"

# Loop through each subdirectory in the 'infra/modules' folder
for module_dir in infra/modules/*; do
    # Ensure it's a directory
    if [ -d "$module_dir" ]; then
        module_name=$(basename "${module_dir}")

        echo "    -> Found Terraform module: ${module_name}."

        # Check if 'terraform init' has already been run
        if [ ! -d "${module_dir}/.terraform" ]; then
            echo "        -> '.terraform' directory not found. Running 'terraform init'..."
            # Run terraform init in a subshell to avoid changing the current directory
            (cd "${module_dir}" && terraform init -upgrade)
        else
            echo "        -> '.terraform' directory already exists. Skipping 'terraform init'."
        fi
    fi
done

syft . -o cyclonedx-json \
    --exclude ./.github \
    --exclude '**/*.md' \
    | jq . | sed "s|${CURRENT_DIR}/|./|g" > "${OUTPUT_DIR}/sbom-workspace.json"
echo "✅ Created: ${output_filename}"

echo ""
echo "--- 🎉 Process complete! ---"
echo "SBOM have been saved"