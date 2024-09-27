#!/bin/bash
set -euo pipefail

# Paths and files
MODULES_DIR=".terraform/modules"
HASHES_FILE="tfmodules.lock.json"
MODULES_METADATA=".terraform/modules/modules.json"
REGISTRY_URL="registry.terraform.io"

calculate_hash() {
    local module_path="$1"
    tar -cf - "$module_path" | sha256sum | awk '{ print $1 }'
}

# If no arguments are passed, set a default value (e.g., current directory)
if [ "$#" -eq 0 ]; then
    echo "No directories specified. Exiting."
    $TARGET_DIR = $PWD
fi
$BASE_DIR = $PWD
# Iterate over all provided directories
for TARGET_DIR in "$@"; do
    # Add your logic here to handle each directory
    if [ -d "$TARGET_DIR" ]; then
        echo "Processing Terraform modules in $TARGET_DIR"
        cd $TARGET_DIR
        terraform init >&2

        # Check if hashes file already exists; otherwise, create it
        if [ ! -f "$HASHES_FILE" ]; then
            echo "{}" > "$HASHES_FILE"
        fi

        # Check if modules metadata exists
        if [ ! -f "$MODULES_METADATA" ]; then
            echo "Modules metadata file not found. Ensure that 'terraform init' has been run." >&2
            exit 1
        fi

        # Iterate over modules listed in the metadata that were sourced from the Terraform registry
        jq -r --arg registry_url "$REGISTRY_URL" \
            '.Modules[] | select(.Source | contains($registry_url)) | .Key' \
            "$MODULES_METADATA" | while read -r module_key; do
            
            module_path="$MODULES_DIR/$module_key"
            
            if [ -d "$module_path" ]; then
                module_name=$(basename "$module_path")
                new_hash=$(calculate_hash "$module_path")

                # Retrieve the previous hash
                previous_hash=$(jq -r --arg module "$module_name" '.[$module]' "$HASHES_FILE")

                if [ "$previous_hash" == "null" ]; then
                    # Save the new hash if not found in the file
                    jq --arg module "$module_name" --arg hash "$new_hash" '.[$module] = $hash' "$HASHES_FILE" > tmp.$$.json && mv tmp.$$.json "$HASHES_FILE"
                    echo "Saving the new hash for module $module_name."
                else
                    # Compare the hashes
                    if [ "$previous_hash" == "$new_hash" ]; then
                        echo "The module $module_name has not changed."
                    else
                        echo "The module $module_name has changed!" >&2
                        # Exit with an error if the module has changed
                        exit 1
                    fi
                fi
            else
                echo "Module path $module_path not found." >&2
            fi
        done
    else
        echo "Directory $TARGET_DIR does not exist. Skipping."
    fi
    cd $BASE_DIR
done