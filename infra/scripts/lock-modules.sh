#!/bin/bash
set -euo pipefail

# Constants
readonly MODULES_DIR=".terraform/modules"
readonly HASHES_FILE="tfmodules.lock.json"
readonly MODULES_METADATA=".terraform/modules/modules.json"
readonly REGISTRY_URL="registry.terraform.io"
readonly SCRIPT_NAME=$(basename "$0")

# Helper Functions
log_info() {
    echo "[${SCRIPT_NAME}] INFO: $1"
}

log_error() {
    echo "[${SCRIPT_NAME}] ERROR: $1" >&2
}

log_warning() {
    echo "[${SCRIPT_NAME}] WARNING: $1" >&2
}

find_terraform_dirs() {
    local base_dir="$1"
    # Find directories containing .tf files, excluding .terraform directories
    find "$base_dir" -type f -name "*.tf" ! -path "*/.terraform/*" -exec dirname {} \; | sort -u
}

calculate_hash() {
    local module_path="$1"
    tar --exclude=.* -czf - "$module_path" 2>/dev/null | sha256sum | awk '{ print $1 }'
}

init_hashes_file() {
    local hashes_file="$1"
    if [ ! -f "$hashes_file" ]; then
        log_info "Creating new hashes file"
        echo "{}" > "$hashes_file"
    fi
}

ensure_terraform_init() {
    # if [ ! -f "$MODULES_METADATA" ]; then
        log_warning "Running terraform init in $(pwd)"
        terraform init -input=false >/dev/null
    # fi
}

process_module() {
    local module_path="$1"
    local module_name=$(basename "$module_path")
    local new_hash=$(calculate_hash "$module_path")
    local previous_hash
    
    # Retrieve the previous hash
    previous_hash=$(jq -r --arg module "$module_name" '.[$module] // "none"' "$HASHES_FILE")

    # Save the new hash
    jq --arg module "$module_name" --arg hash "$new_hash" '.[$module] = $hash' \
        "$HASHES_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$HASHES_FILE"
    
    if [ "$previous_hash" = "none" ]; then
        log_info "Module $module_name: Initial hash created"
        return 1
    elif [ "$previous_hash" != "$new_hash" ]; then
        log_info "Module $module_name: Changes detected, updating hash"
        return 1
    else
        log_info "Module $module_name: No changes detected"
        return 0
    fi
}

get_modules_from_tf_files() {
    # Extract module sources from .tf files
    grep -h 'source[[:space:]]*=' *.tf 2>/dev/null | \
    sed -E 's/.*source[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/' | \
    sort -u || echo ""
}

get_modules_from_metadata() {
    # Extract module sources from modules.json
    if [ -f "$MODULES_METADATA" ]; then
        jq -r '.Modules[].Source' "$MODULES_METADATA" 2>/dev/null | sort -u || echo ""
    else
        echo ""
    fi
}

needs_terraform_init() {
    local current_modules
    local metadata_modules
    
    # If modules.json doesn't exist, we need to init
    if [ ! -f "$MODULES_METADATA" ]; then
        log_info "No modules.json found, terraform init needed"
        return 0
    fi

    # Get current modules from .tf files
    current_modules=$(get_modules_from_tf_files)
    if [ -z "$current_modules" ]; then
        log_info "No modules found in .tf files"
        return 1
    fi

    # Get modules from metadata
    metadata_modules=$(get_modules_from_metadata)
    
    # Compare the sorted unique lists
    if [ "$current_modules" != "$metadata_modules" ]; then
        log_info "Module changes detected, terraform init needed"
        log_info "Current modules:"
        echo "$current_modules"
        log_info "Cached modules:"
        echo "$metadata_modules"
        return 0
    fi

    log_info "No module changes detected, skipping terraform init"
    return 1
}

ensure_terraform_init() {
    if needs_terraform_init; then
        log_warning "Running terraform init in $(pwd)"
        if ! terraform init -input=false >/dev/null; then
            log_error "Terraform init failed"
            return 1
        fi
    fi
    return 0
}

process_directory() {
    local target_dir="$1"
    local base_dir="$2"
    local changes_found=0

    if [ ! -d "$target_dir" ]; then
        log_error "Directory $target_dir does not exist"
        return 1
    fi

    log_info "Processing Terraform modules in $target_dir"
    
    # Change to target directory
    cd "$target_dir"

    # Initialize hash file
    init_hashes_file "$HASHES_FILE"
    
    # Run terraform init only if needed
    ensure_terraform_init || return 1

    # Process modules only if modules.json exists
    if [ -f "$MODULES_METADATA" ]; then
        # Process registry modules
        while read -r module_key; do
            if [ -n "$module_key" ]; then
                local module_path="$MODULES_DIR/$module_key"
                if [ -d "$module_path" ]; then
                    if ! process_module "$module_path"; then
                        changes_found=1
                    fi
                else
                    log_warning "Module path $module_path not found"
                fi
            fi
        done < <(jq -r --arg registry_url "$REGISTRY_URL" \
            '.Modules[] | select(.Source | contains($registry_url)) | .Key' \
            "$MODULES_METADATA" 2>/dev/null || echo "")
    fi

    cd "$base_dir"
    return $changes_found
}

main() {
    local base_dir="$PWD"
    local exit_code=0
    local dirs_to_process=()

    # Check for required commands
    for cmd in jq terraform tar sha256sum; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done

    # If specific directories are provided, use them
    if [ "$#" -gt 0 ]; then
        log_info "Processing specified directories"
        dirs_to_process=("$@")
    else
        log_info "No directories specified, detecting Terraform directories"
        while IFS= read -r dir; do
            dirs_to_process+=("$dir")
        done < <(find_terraform_dirs "$base_dir")
    fi

    if [ ${#dirs_to_process[@]} -eq 0 ]; then
        log_warning "No Terraform directories found"
        exit 0
    fi

    log_info "Found ${#dirs_to_process[@]} Terraform directories to process"
    
    for target_dir in "${dirs_to_process[@]}"; do
        log_info "Processing directory: $target_dir"
        if ! process_directory "$target_dir" "$base_dir"; then
            exit_code=1
        fi
    done

    if [ $exit_code -eq 1 ]; then
        log_warning "Changes detected in one or more modules"
    fi

    exit $exit_code
}

main "$@"
