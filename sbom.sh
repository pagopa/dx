#!/bin/bash
set -e

# ==============================================================================
# GLOBAL VARIABLES
# ==============================================================================

CURRENT_DIR=$(pwd)
SBOM_DIR="sboms"

# ==============================================================================
# HELP FUNCTION
# ==============================================================================

show_help() {
    echo "Usage: $(basename "$0") [OPTION]"
    echo "Manages the generation and validation of SBOMs."
    echo ""
    echo "Options:"
    echo "  -g, --generate        Run the SBOM generation process, force regeneration of all existing SBOM (*default)."
    echo "  -u, --update          Generate only missing SBOM files."
    echo "  -v, --validate        Run validation on existing SBOM files."
    echo "  -h, --help            Show this help message and exit."
    echo ""
    echo "If no option is provided, the script will force the regeneration of all SBOMs by default."
}

# ==============================================================================
# FUNCTION FOR SBOM GENERATION
# ==============================================================================

generate_sboms() {
    MODE=$1

    if [[ "$MODE" == "update" ]]; then
        echo "--- Starting SBOMs update process (only missing files) ---"
    else
        echo "--- Starting SBOMs generation process ---"
    fi

    # Default value "owned-by-package"
    # Ref.: https://github.com/anchore/syft/wiki/file-selection
    export SYFT_FILE_METADATA_SELECTION="none"

    #########################################################
    # Create the output directory only if it does not exist #
    #########################################################

    if [ ! -d "${SBOM_DIR}" ]; then
        echo "▶️  Output directory ./${SBOM_DIR} not found, creating it..."
        mkdir -p ${SBOM_DIR}
    else
        echo "▶️  Output directory ./${SBOM_DIR} already exists."
    fi

    ##################################################################
    # Generate SBOM for Node.js (pnpm) dependencies and Go providers #
    ##################################################################
    # Some directories and file types are excluded
    # Ref.: https://github.com/anchore/syft/wiki/excluding-file-paths
    workspace_filename="${SBOM_DIR}/sbom-npm-workspace.json"

    if [[ "$MODE" == "update" && -f "$workspace_filename" ]]; then
        echo "✅ SBOM for workspace already exists. Skipping."
    else
        echo "▶️  Generating SBOM for Node.js (pnpm) dependencies and Go providers..."
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
            output_filename="${SBOM_DIR}/sbom-go-${provider_name}.json"

            echo "    -> Found Provider: ${provider_name}."

            if [[ "$MODE" == "update" && -f "$output_filename" ]]; then
                echo "✅ SBOM for provider ${provider_name} already exists. Skipping."
            else
                echo "    -> Generating SBOM for ${provider_name}..."
                (
                    cd "${provider_dir}" && syft . -o cyclonedx-json
                ) | jq . | sed "s|${CURRENT_DIR}/|./|g" > "${output_filename}"
                echo "✅ Created: ${output_filename}"
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
            output_filename="${SBOM_DIR}/sbom-terraform-${module_name}.json"

            echo "    -> Found Terraform module: ${module_name}."

            if [[ "$MODE" == "update" && -f "$output_filename" ]]; then
                echo "✅ SBOM for module ${module_name} already exists. Skipping."
            else
                if [ ! -d "${module_dir}/.terraform" ]; then
                    echo "        -> '.terraform' directory not found. Running 'terraform init'..."
                    (cd "${module_dir}" && terraform init -upgrade)
                else
                    echo "        -> '.terraform' directory already exists. Skipping 'terraform init'."
                fi
                echo "    -> Generating SBOM for ${module_name}..."
                (
                    cd "${module_dir}" && syft . -o cyclonedx-json
                ) | jq . | sed "s|${CURRENT_DIR}/|./|g" > "${output_filename}"
                echo "✅ Created: ${output_filename}"
            fi
        fi
    done


    echo ""
    echo "--- 🎉 Process complete! ---"
    echo "All SBOMs have been saved to the directory: ./${SBOM_DIR}"
}

# ==============================================================================
# FUNCTION FOR SBOM VALIDATION
# ==============================================================================

validate_sboms() {
    echo "--- Start SBOMs validation process ---"
    echo "▶️  Scanning for SBOM files in ./${SBOM_DIR}..."

    # Validate and Analyze each SBOM file in the directory
    for sbom_file in "${SBOM_DIR}"/*.json; do
        echo "    -> Validating file: $(basename "$sbom_file")"
        file_path=$(realpath "$sbom_file")
        grype sbom:$file_path
    done

    echo ""
    echo "--- 🎉 All SBOM files in ./${SBOM_DIR} are valid! ---"
}

# ==============================================================================
# MAIN LOGIC
# ==============================================================================

# Check each command and exit if not found
echo "▶️  Checking for required commands (syft, grype, terraform, jq)..."
command_exists() {
    command -v "$1" >/dev/null 2>&1
}
for cmd in syft grype terraform jq; do
    if ! command_exists $cmd; then
        echo "❌ Error: '$cmd' is not installed or not in PATH. Please install it."
        exit 1
    fi
done
echo "✅ All required commands are present."

# Arguments parsing
case "$1" in
    -g|--generate)
        generate_sboms
        ;;
    -u|--update)
        generate_sboms "update"
        ;;
    -v|--validate)
        validate_sboms
        ;;
    -h|--help)
        show_help
        ;;
    *)
        generate_sboms
        ;;
esac