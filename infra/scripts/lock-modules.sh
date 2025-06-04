#!/bin/bash
# Enable error handling: exit on error (-e) and pipe failures (-o pipefail)
set -eo pipefail

readonly MODULES_DIR=".terraform/modules"                      # Directory where Terraform stores downloaded modules
readonly HASHES_FILE="tfmodules.lock.json"                     # File to store module hashes
readonly MODULES_METADATA=".terraform/modules/modules.json"    # Terraform's module metadata file
readonly REGISTRY_URL="registry.terraform.io"                  # Default Terraform registry URL
readonly SCRIPT_NAME=$(basename "$0")                          # Get the script name for logging
readonly JSON_OUTPUT_FILE="${LOCK_MODULES_JSON_OUTPUT_FILE:-}" # Optional file path for JSON output. Set it to the name or path of the JSON file to produce (e.g. lock_output.json)

# Enable debug mode if PRECOMMIT_DEBUG environment variable is set to 1
# set -x enables printing of each command before execution
if [[ "${PRECOMMIT_DEBUG:-0}" -eq 1 ]]; then
    set -x
fi

declare  module_results='[]'

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

# Add module result to JSON output
function add_module_result() {
    local module_name="$1"
    local status="$2"
    local version="$3"
    local message="$4"
    local hash="$5"
    local prevhash="$6"
    local modulefoldername="$7"

    # Only filter out unchanged and skipped modules - always include removed ones
    if [[ "$status" == "unchanged" || "$status" == "skipped" ]]; then
        return 0
    fi

    # Log it in both output formats
    if [[ "$status" == "removed" ]]; then
        info "Module $module_name was removed from configuration"
    fi

    # Create JSON entry
    local json_entry
    json_entry=$(jq -n \
        --arg name "$module_name" \
        --arg status "$status" \
        --arg version "$version" \
        --arg message "$message" \
        --arg hash "$hash" \
        --arg prevhash "$prevhash" \
        --arg modulefoldername "$modulefoldername" \
        '{
            "module": $name,
            "name": $modulefoldername,
            "status": $status,
            "version": $version,
            "message": $message,
            "hash": $hash,
            "prevhash": $prevhash
        }')

    echo "$json_entry" >> "$JSON_OUTPUT_FILE"
}

# Write JSON results to file if requested
function write_json_results() {
    local exit_code="${1:-0}"

    if [[ -n "$JSON_OUTPUT_FILE" ]]; then
        # Create summary data
        local summary_data
        summary_data=$(jq -n \
            --arg total "$(echo "$module_results" | jq 'length')" \
            --arg exit_code "$exit_code" \
            '{
                "total_modules": $total|tonumber,
                "exit_code": $exit_code|tonumber
            }')

        # Create and write the final JSON structure to the specified file
        printf '{"summary":%s,"results":%s}' \
            "$summary_data" \
            "$module_results" | jq . > "$JSON_OUTPUT_FILE"

        info "JSON output written to $JSON_OUTPUT_FILE"
    fi
}

# Extract module sources from Terraform files in current directory
function get_modules_from_tf_files() {
    # Step 1: Find lines containing 'source =' in all .tf files
    grep -h 'source[[:space:]]*=' ./*.tf 2>/dev/null | \
    # Step 2: Extract just the source value using sed
    sed -E 's/.*source[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/' | \
    # Step 3: Sort and remove duplicates
    LC_ALL=C sort -u || echo ""
}

# Extract module sources from Terraform's modules.json metadata
function get_modules_from_metadata() {
    if [[ -f "$MODULES_METADATA" ]]; then
        jq -r '.Modules[].Source' "$MODULES_METADATA" 2>/dev/null | LC_ALL=C sort -u || echo ""
    else
        echo ""
    fi
}

function get_module_info_from_metadata() {
  local module_name="$1"

  jq -c --arg module_name "$module_name" \
    '.Modules[] | select(.Key == $module_name)' \
    "$MODULES_METADATA" 2>/dev/null || echo ""
}

# Ensure Terraform modules are initialized
# This function refreshes the local module cache to ensure we're working with the latest versions
# and to maintain consistency across environments
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
# This creates a unique fingerprint of the module to detect changes between runs
# and ensure consistent module versions across environments
function calculate_hash() {
    local -r module_path="$1"
    # Create tar archive excluding hidden files, then calculate SHA256 hash
    # tar --exclude='$module_path/.*' -cf - "$module_path" | sha256sum | awk '{ print $1 }'
    find "$module_path" -type f -not -path "$module_path/.*" | LC_ALL=C sort | xargs sha256sum | awk '{print $1}' | sha256sum | awk '{print $1}'
}

# Initialize or create the hashes file if it doesn't exist
# This file serves as a lock file to track module versions and detect changes
# between deployments, ensuring infrastructure consistency
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
    local module_version="unknown"
    local module_folder_name="unknown"
    local module_source=$(get_module_info_from_metadata "$module_name" | jq -r '.Source // "unknown"')

    # Try to get module version from package.json if it exists
    if [[ -f "$module_path/package.json" ]]; then
        module_version=$(jq -r '.version // "unknown"' "$module_path/package.json")
        module_folder_name=$(jq -r '.name // "unknown"' "$module_path/package.json")
    fi

    # Get previous hash from hashes file
    # the if allows to still manage the legacy lock files
    # containing only the hash instead of an object
    previous_hash=$(jq -r --arg module_name "$module_name" '
      if (.[$module_name] | type) == "object" then
        .[$module_name].hash
      else
        .[$module_name]
      end // "none"
    ' "${HASHES_FILE:-/dev/null}")
    # Update hash in hashes file
    jq --arg module_name "$module_name" \
      --arg new_hash "$new_hash" \
      --arg module_version "$module_version" \
      --arg module_folder_name "$module_folder_name" \
      --arg module_source "$module_source" \
      '.[$module_name] = {hash: $new_hash, version: $module_version, name: $module_folder_name, source: $module_source}' \
      "$HASHES_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$HASHES_FILE"

    # Handle hash changes
    if [[ "$previous_hash" == "none" ]]; then
        info "Module $module_name: Initial hash created"
        add_module_result "$module_name" "new" "$module_version" "Initial hash created" "$new_hash" "$previous_hash" "$module_folder_name"
        return 1
    elif [[ "$previous_hash" != "$new_hash" ]]; then
        info "Module $module_name: Changes detected, updating hash"
        add_module_result "$module_name" "changed" "$module_version" "Changes detected" "$new_hash" "$previous_hash" "$module_folder_name"
        return 1
    else
        debug "Module $module_name: No changes detected"
        return 0
    fi
}

# Check if the current Terraform configuration uses registry modules
# This helps us skip unnecessary processing when no registry modules are present,
# improving script performance and avoiding empty lock files
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
# This function handles the core workflow of detecting, hashing, and tracking module changes
# to ensure consistent module versions and alert on unexpected changes
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
            debug "Checking for removed modules..."
            jq -r 'keys[]' "$HASHES_FILE" | while read -r existing_key; do
                if ! grep -q "^${existing_key}$" "$temp_keys_file"; then
                    # This is an expected change - we're removing a module that's no longer in the config
                    info "Removing old module key: $existing_key"

                    # Get the previous hash before removing it
                    # the if allows to still manage the legacy lock files
                    # containing only the hash instead of an object
                    local previous_hash
                    previous_hash=$(jq -r --arg key "$existing_key" '
                      if (.[$key] | type) == "object" then
                        .[$key].hash
                      else
                        .[$key]
                      end // "none"
                    ' "${HASHES_FILE:-/dev/null}")

                    # Add to results (will be included in JSON since status is "removed")
                    add_module_result "$existing_key" "removed" "n/a" "Module removed from configuration" "none" "$previous_hash" "unknown"

                    # Remove from lock file
                    jq "del(.[\"$existing_key\"])" "$HASHES_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$HASHES_FILE"

                    # This is a legitimate change, not an error
                    changes_found=1
                fi
            done
        fi

        # Only proceed if registry modules are found
        if ! has_registry_modules; then
            debug "No registry modules found in $target_dir, skipping"
            cd "$base_dir"
            return 0
        fi

        # Process current modules
        while IFS= read -r module_key; do
            if [[ -n "$module_key" ]]; then
                local module_path="$MODULES_DIR/$module_key"
                local module_version="unknown"
                # Get module version
                if [[ -f "$module_path/package.json" ]]; then
                    module_version=$(jq -r '.version // "unknown"' "$module_path/package.json")
                fi
                # Process module if directory exists
                if [[ -d "$module_path" ]]; then
                    info "Processing module: $module_path with version $module_version"
                    if ! process_module "$module_path"; then
                        changes_found=1
                    fi
                else
                    debug "Module path $module_path not found"
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
                done | LC_ALL=C sort -u))

    # Verify all required commands are available
    for cmd in jq terraform tar sha256sum; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done

    info "Detecting Terraform directories..."

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
        debug "Changes detected in $target_dir, setting exit code to 1"
      fi

      # Only process JSON_OUTPUT_FILE if it exists
      if [[ -f "$target_dir/$JSON_OUTPUT_FILE" ]]; then
        # Add the root module's path to the JSON results
        value="$(jq --arg path "$target_dir" -s 'map(. + {path: $path})' "$target_dir/$JSON_OUTPUT_FILE")"
        module_results="$(jq -n --argjson arr1 "$module_results" --argjson arr2 "$value" '$arr1 + $arr2')"
        rm -f "$target_dir/$JSON_OUTPUT_FILE" 2>/dev/null || true
      fi
    done

    # Warn if changes were detected
    if [[ $exit_code -eq 1 ]]; then
        warn "Changes detected in one or more modules"
    fi

    # Write JSON results to file if requested
    write_json_results "$exit_code"

    exit $exit_code
}

# Script entry point
# Only run main if the script is being executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
