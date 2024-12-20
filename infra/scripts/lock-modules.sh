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

# Find all Terraform files (.tf) in the given path
# Excludes files in .terraform/, examples/, tests/, and modules/ directories
function get_terraform_files() {
    local -r path="$1"
    
    find "$path" \
        -type f \
        -name '*.tf' \
        -not -path "**/.terraform/*" \
        -not -path "**/examples/*" \
        -not -path "**/tests/*" \
        -not -path "**/modules/*"
}

# Get unique directories containing Terraform files
# This helps process each Terraform configuration only once
function get_terraform_dirs() {
    local -r path="${1:-.}"    # Use current directory if no path provided
    local -a dirs=()           # Array to store unique directories
    local dir

    # Process each Terraform file and extract its directory
    while IFS= read -r file; do
        dir=$(dirname "$file")
        # Add directory to array if not already present
        if [[ ! " ${dirs[*]} " =~ " ${dir} " ]]; then
            dirs+=("$dir")
        fi
    done < <(get_terraform_files "$path")

    # Print unique directories, handling empty array case
    printf '%s\n' "${dirs[@]+"${dirs[@]}"}"
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

# Check if 'terraform get' needs to be run
# Returns 0 (true) if init is needed, 1 (false) if not
function needs_terraform_get() {
    local current_modules
    local metadata_modules
    
    # Always need init if modules.json doesn't exist
    if [[ ! -f "$MODULES_METADATA" ]]; then
        debug "No modules.json found, terraform get needed"
        return 0
    fi

    # Get current module sources from .tf files
    current_modules=$(get_modules_from_tf_files)
    if [[ -z "$current_modules" ]]; then
        debug "No modules found in .tf files"
        return 1
    fi

    # Get cached module sources from modules.json
    metadata_modules=$(get_modules_from_metadata)
    
    # Compare current and cached modules
    if [[ "$current_modules" != "$metadata_modules" ]]; then
        debug "Module changes detected"
        debug "Current modules: $current_modules"
        debug "Cached modules: $metadata_modules"
        return 0
    fi

    debug "No module changes detected"
    return 1
}

# Ensure Terraform modules are initialized
function ensure_terraform_get() {
    if needs_terraform_get; then
        warn "Running terraform get in $(pwd)"
        if ! terraform get -update >/dev/null; then
            error "terraform get failed"
            return 1
        fi
    fi
    return 0
}

# Calculate hash for a module's contents
function calculate_hash() {
    local -r module_path="$1"
    # Create tar archive excluding hidden files, then calculate SHA256 hash
    tar --exclude=.* -cvf - "$module_path" | sha256sum | awk '{ print $1 }'
}

# Initialize or create the hashes file if it doesn't exist
function init_hashes_file() {
    local -r hashes_file="$1"
    if [[ ! -f "$hashes_file" ]]; then
        info "Creating new hashes file"
        echo "{}" > "$hashes_file"     # Create empty JSON object
        git add "$hashes_file" 2>/dev/null || true  # Track file in git
    fi
}

# Process a single module: calculate its hash and update the hashes file
function process_module() {
    local -r module_path="$1"
    local -r module_name=$(basename "$module_path")
    local -r new_hash=$(calculate_hash "$module_path")
    local previous_hash
    
    init_hashes_file "$HASHES_FILE"

    # Get previous hash from hashes file
    previous_hash=$(jq -r --arg module "$module_name" '.[$module] // "none"' "${HASHES_FILE:-/dev/null}")

    # Update hash in hashes file
    jq --arg module "$module_name" --arg hash "$new_hash" '.[$module] = $hash' \
        "$HASHES_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$HASHES_FILE"
    
    # Handle hash changes
    if [[ "$previous_hash" == "none" ]]; then
        info "Module $module_name: Initial hash created"
        git add "$HASHES_FILE" 2>/dev/null || true
        return 1
    elif [[ "$previous_hash" != "$new_hash" ]]; then
        info "Module $module_name: Changes detected, updating hash"
        git add "$HASHES_FILE" 2>/dev/null || true
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

    # Check if lock file exists but no registry modules are present
    if [[ -f "$HASHES_FILE" ]] && ! has_registry_modules; then
        info "No registry modules found but lock file exists, removing it"
        rm -f "$HASHES_FILE"
        cd "$base_dir"
        return 0
    fi

    # Only proceed if registry modules are found
    if ! has_registry_modules; then
        info "No registry modules found in $target_dir, skipping"
        cd "$base_dir"
        return 0
    fi

    # Process modules if metadata file exists
    if [[ -f "$MODULES_METADATA" ]]; then
        # Read each module key from the metadata file
        while IFS= read -r module_key; do
            if [[ -n "$module_key" ]]; then
                local module_path="$MODULES_DIR/$module_key"
                # Process module if directory exists
                if [[ -d "$module_path" ]]; then
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
    local -a dirs_to_process=()       # Array to store directories to process

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
    while IFS= read -r dir; do
        if [[ -n "$dir" ]]; then
            dirs_to_process+=("$dir")
        fi
    done < <(get_terraform_dirs "$base_dir")

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
