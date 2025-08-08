#!/bin/bash
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(pwd)
OUTPUT_DIR="sboms"
CHANGED_FILES=$(git diff --name-only origin/main)

# Default value "owned-by-package"
# Ref.: https://github.com/anchore/syft/wiki/file-selection
export SYFT_FILE_METADATA_SELECTION="none"

if [ "$REPO_ROOT" != "$CURRENT_DIR" ]; then
    echo "Skipping hook because it's not run from repo root."
    exit 0
fi

# Check if there are any changes in the repository
run_workspace_sbom=false
changed_modules=()
changed_providers=()

while IFS= read -r file; do
    if [[ "$file" == infra/modules/* ]]; then
        module_name=$(echo "$file" | cut -d'/' -f3)
        changed_modules+=("$module_name")
    elif [[ "$file" == providers/* ]]; then
        provider_name=$(echo "$file" | cut -d'/' -f2)
        changed_providers+=("$provider_name")
    elif [[ "$file" == apps/* || "$file" == pnpm-* ]]; then
        run_workspace_sbom=true
    fi
done <<< "$CHANGED_FILES"

echo "--- Starting SBOM generation for the dx repository ---"

############################################
# Check each command and exit if not found #
############################################

echo "▶️  Checking for required commands (trivy, syft, terraform, jq)..."
# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

if ! command_exists trivy; then
    echo "❌ Error: 'trivy' is not installed or not in PATH. Please install it."
    exit 1
fi
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

#########################################################
# Create the output directory only if it does not exist #
#########################################################

if [ ! -d "${OUTPUT_DIR}" ]; then
    echo "▶️  Output directory ./${OUTPUT_DIR} not found, creating it..."
    mkdir -p ${OUTPUT_DIR}
else
    echo "▶️  Output directory ./${OUTPUT_DIR} already exists."
fi

##################################################################
# Generate SBOM for Node.js (pnpm) dependencies and Go providers #
##################################################################
# Some directories and file types are excluded
# Ref.: https://github.com/anchore/syft/wiki/excluding-file-paths
workspace_filename="${OUTPUT_DIR}/sbom-npm-workspace.json"

if [[ ! -f "$workspace_filename" || "$run_workspace_sbom" == true ]]; then
    echo "▶️  Generating SBOM for Node.js (pnpm) dependencies and Go providers in ./providers/..."
    syft . -o cyclonedx-json \
        --exclude ./infra \
        --exclude **/.terraform \
        --exclude ./.github \
        --exclude ./actions \
        --exclude ./providers \
        --exclude '**/*.md' \
        --exclude '**/*.png' \
        | jq . | sed "s|${CURRENT_DIR}/|./|g" > "$workspace_filename"
    echo "✅ Created: $workspace_filename"
fi
##########################################################
# Generate SBOMs for Terraform providers in ./providers/ #
##########################################################

echo "▶️  Finding and generating SBOMs for Terraform providers in ./providers/ ..."

# Loop through each subdirectory in the 'providers' folder
for provider_dir in providers/*; do
    # Ensure it's a directory
    if [ -d "$provider_dir" ]; then
        provider_name=$(basename "${provider_dir}")
        output_filename="${OUTPUT_DIR}/sbom-go-${provider_name}.json"

        echo "    -> Found Provider: ${provider_name}."

        if [[ ! -f "$output_filename" || " ${changed_providers[@]} " =~ " ${provider_name} " ]]; then
            echo "    -> Generating SBOM for ${provider_name}..."
            (
                cd "${provider_dir}" && syft . -o cyclonedx-json
            ) | jq . | sed "s|${CURRENT_DIR}/|./|g" > "${output_filename}"
            echo "✅ Created: ${output_filename}"
        else
            echo "✅ SBOM already updated for provider: $provider_name"
        fi
    fi
done

############################################################
# Generate SBOMs for Terraform modules in ./infra/modules/ #
############################################################

echo "▶️  Finding and generating SBOMs for Terraform modules in ./infra/modules/ ..."

# Loop through each subdirectory in the 'infra/modules' folder
for module_dir in infra/modules/*; do
    # Ensure it's a directory
    if [ -d "$module_dir" ]; then
        module_name=$(basename "${module_dir}")
        output_filename="${OUTPUT_DIR}/sbom-terraform-${module_name}.json"

        echo "    -> Found Terraform module: ${module_name}."

        if [[ ! -f "$output_filename" || " ${changed_modules[@]} " =~ " ${module_name} " ]]; then
            # Check if 'terraform init' has already been run
            if [ ! -d "${module_dir}/.terraform" ]; then
                echo "        -> '.terraform' directory not found. Running 'terraform init'..."
                # Run terraform init in a subshell to avoid changing the current directory
                (cd "${module_dir}" && terraform init -upgrade)
            else
                echo "        -> '.terraform' directory already exists. Skipping 'terraform init'."
            fi

            echo "    -> Generating SBOM for ${module_name}..."
            (
                cd "${module_dir}" && syft . -o cyclonedx-json
            ) | jq . | sed "s|${CURRENT_DIR}/|./|g" > "${output_filename}"

            echo "✅ Created: ${output_filename}"
        else
            echo "✅ SBOM already updated for module: $module_name"
        fi
    fi
done


echo ""
echo "--- 🎉 Process complete! ---"
echo "All SBOMs have been saved to the directory: ./${OUTPUT_DIR}"
ls -l ${OUTPUT_DIR}