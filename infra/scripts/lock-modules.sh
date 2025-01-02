#!/bin/bash
# Enable error handling: exit on error (-e) and pipe failures (-o pipefail)
set -eo pipefail

readonly MODULES_DIR=".terraform/modules"          # Directory where Terraform stores downloaded modules
readonly HASHES_FILE="tfmodules.lock.json"        # File to store module hashes
readonly MODULES_METADATA=".terraform/modules/modules.json"  # Terraform's module metadata file
readonly REGISTRY_URL="registry.terraform.io"      # Default Terraform registry URL
readonly SCRIPT_NAME=$(basename "$0")              # Get the script name for logging

# Enable debug mode if PRECOMMIT_DEBUG environment variable is set to 1
# set -x enables printing of each command before execution
if [[ "${PRECOMMIT_DEBUG:-0}" -eq 1 ]]; then
    set -x
fi

# Logging functions for different severity levels
# All output is sent to stderr (>&2) to keep stdout clean for piping
readonly PRE_COMMIT_VERBOSE="${PRE_COMMIT_VERBOSE:-0}"  # Default to non-verbose if not set

function debug() {
    # Only print debug messages if both PRECOMMIT_DEBUG and VERBOSE are enabled
    if [[ "${PRECOMMIT_DEBUG:-0}" -eq 1 && "${PRE_COMMIT_VERBOSE}" -eq 1 ]]; then
        echo "DEBUG: $*" >&2
    fi
}

function error() {
    # Always show errors regardless of verbose mode
    echo "ERROR: $*" >&2
}

function warn() {
    if [[ "${PRE_COMMIT_VERBOSE}" -eq 1 ]]; then
        echo "WARN: $*" >&2
    fi
}

function info() {
    if [[ "${PRE_COMMIT_VERBOSE}" -eq 1 ]]; then
        echo "INFO: $*" >&2
    fi
}

# Extract module sources from Terraform files in current directory
function get_modules_from_tf_files() {
    # Step 1: Find lines containing 'source =' in all .tf files
    grep -h 'source[[:space:]]*=' ./*.tf 2>/dev/null | \
    # Step 2: Extract just the source value using sed
    sed -E 's/.*source[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/' | \
    # Step 3: Sort and remove duplicates
    sort -u || echo ""
}

# Extract module sources from Terraform's modules.json metadata
function get_modules_from_metadata() {
    if [[ -f "$MODULES_METADATA" ]]; then
        jq -r '.Modules[].Source' "$MODULES_METADATA" 2>/dev/null | sort -u || echo ""
    else
        echo ""
    fi
}

# Ensure Terraform modules are initialized
function ensure_terraform_get() {
    warn "Running terraform get in $(pwd)"
    rm -rf "$MODULES_DIR" 2>/dev/null || true
    if ! terraform get -update >/dev/null; then
        error "terraform get failed"
        return 1
    fi
    return 0
}

# Calculate hash for a module's contents
function calculate_hash() {
    local -r module_path="$1"
    # Create tar archive excluding hidden files, then calculate SHA256 hash
    # tar --exclude='$module_path/.*' -cf - "$module_path" | sha256sum | awk '{ print $1 }'
    find "$module_path" -type f -not -path "$module_path/.*" | sort | xargs sha256sum | awk '{print $1}' | sha256sum | awk '{print $1}'
}

# Initialize or create the hashes file if it doesn't exist
function init_hashes_file() {
    local -r hashes_file="$1"
    if [[ ! -f "$hashes_file" ]]; then
        info "Creating new hashes file"
        echo "{}" > "$hashes_file"     # Create empty JSON object
    fi
}

# Process a single module: calculate its hash and update the hashes file
function process_module() {
    local -r module_path="$1"
    local -r module_name=$(basename "$module_path")
    local -r new_hash=$(calculate_hash "$module_path")
    local previous_hash
    
    # Get previous hash from hashes file
    previous_hash=$(jq -r --arg module_name "$module_name" '.[$module_name] // "none"' "${HASHES_FILE:-/dev/null}")
    # Update hash in hashes file
    jq --arg module_name "$module_name" --arg new_hash "$new_hash" '.[$module_name] = $new_hash' \
        "$HASHES_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$HASHES_FILE"
    
    # Handle hash changes
    if [[ "$previous_hash" == "none" ]]; then
        info "Module $module_name: Initial hash created"
        return 1
    elif [[ "$previous_hash" != "$new_hash" ]]; then
        info "Module $module_name: Changes detected, updating hash"
        return 1
    else
        debug "Module $module_name: No changes detected"
        return 0
    fi
}

function has_registry_modules() {
    local modules
    
    # Get all module sources
    modules=$(get_modules_from_metadata)
    
    # Check if any module contains the registry URL
    if echo "$modules" | grep -q "^$REGISTRY_URL"; then
        debug "Found registry modules"
        return 0
    fi
    
    debug "No registry modules found"
    return 1
}

# Process a single directory containing Terraform configurations
function process_directory() {
    local -r target_dir="$1"          # Directory to process
    local -r base_dir="$2"            # Original working directory
    local changes_found=0             # Track if any modules changed
    # Validate directory exists
    if [[ ! -d "$target_dir" ]]; then
        error "Directory $target_dir does not exist"
        return 1
    fi

    debug "Processing Terraform modules in $target_dir"
    
    # Change to target directory for processing
    cd "$target_dir"
    
    ensure_terraform_get || return 1

    # Initialize hashes file if it doesn't exist
    init_hashes_file "$HASHES_FILE"

    # Check if lock file exists but no registry modules are present
    if ! has_registry_modules; then
        info "No registry modules found but lock file exists, removing it"
        cd "$base_dir"
        return 0
    fi

    # Only proceed if registry modules are found
    if ! has_registry_modules; then
        info "No registry modules found in $target_dir, skipping"
        cd "$base_dir"
        return 0
    fi

    init_hashes_file "$HASHES_FILE"
    
    # Create a temporary file to store current module keys
    local temp_keys_file=$(mktemp)
    
    # Process modules if metadata file exists
    if [[ -f "$MODULES_METADATA" ]]; then
        # Read each module key from the metadata file and store in temp file
        jq -r --arg registry_url "$REGISTRY_URL" \
            '.Modules[] | select(.Source | contains($registry_url)) | .Key' \
            "$MODULES_METADATA" > "$temp_keys_file" 2>/dev/null
        
        # Remove any keys from lock file that aren't in current modules
        if [[ -f "$HASHES_FILE" ]]; then
            jq -r 'keys[]' "$HASHES_FILE" | while read -r existing_key; do
                if ! grep -q "^${existing_key}$" "$temp_keys_file"; then
                    info "Removing old module key: $existing_key"
                    jq "del(.[\"$existing_key\"])" "$HASHES_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$HASHES_FILE"
                fi
            done
        fi
        
        # Process current modules
        while IFS= read -r module_key; do
            if [[ -n "$module_key" ]]; then
                local module_path="$MODULES_DIR/$module_key"
                # Process module if directory exists
                if [[ -d "$module_path" ]]; then
                    info "Processing module: $module_path with version $(jq -r '.version' ${module_path}/package.json)"
                    if ! process_module "$module_path"; then
                        changes_found=1
                    fi
                else
                    warn "Module path $module_path not found"
                fi
            fi
        # Use jq to extract module keys for modules from the specified registry
        done < <(jq -r --arg registry_url "$REGISTRY_URL" \
            '.Modules[] | select(.Source | contains($registry_url)) | .Key' \
            "$MODULES_METADATA" 2>/dev/null || echo "")
    fi

    # Return to original directory
    cd "$base_dir"
    return $changes_found
}

# Main function - entry point of the script
function main() {
    local -r base_dir="$PWD"          # Store current working directory
    local exit_code=0                 # Track overall script success
    local -a dirs_to_process=("$@")   # Array to store directories to process

    dirs_to_process=($(for file in "${dirs_to_process[@]}"; do
                    dirname "$file"
                done | sort -u))

    # Verify all required commands are available
    for cmd in jq terraform tar sha256sum; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done

    info "Detecting Terraform directories..."
    
    # Build array of directories to process
    # Using while read instead of mapfile for better compatibility
    # while IFS= read -r dir; do
    #     if [[ -n "$dir" ]]; then
    #         dirs_to_process+=("$dir")
    #     fi
    # done < <(get_terraform_dirs "$base_dir")

    # Exit early if no directories found
    if [[ ${#dirs_to_process[@]} -eq 0 ]]; then
        warn "No Terraform directories found"
        exit 0
    fi

    # Display list of directories to be processed
    info "Found ${#dirs_to_process[@]} Terraform directories to process:"
    for dir in "${dirs_to_process[@]}"; do
        info "  - $dir"
    done
    
    # Process each directory
    for target_dir in "${dirs_to_process[@]}"; do
        info "Processing directory: $target_dir"
        if ! process_directory "$target_dir" "$base_dir"; then
            exit_code=1
        fi
    done

    # Warn if changes were detected
    if [[ $exit_code -eq 1 ]]; then
        warn "Changes detected in one or more modules"
    fi

    exit $exit_code
}

# Script entry point
# Only run main if the script is being executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
