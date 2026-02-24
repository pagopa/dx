#!/usr/bin/env bash
set -euo pipefail

# Collect generated Terraform files into a staging directory for artifact upload.
#
# Usage:
#   collect-artifacts.sh --changed-dirs <json> [--artifacts-path <path>]
#
# Options:
#   --changed-dirs <json>      JSON array of changed directories (from extract-directories.sh)
#   --artifacts-path <path>    Destination directory for collected files (default: .terraform-artifacts)
#
# Output (GITHUB_OUTPUT):
#   artifacts_path - Path to the collected artifacts directory

# Parse command-line arguments
CHANGED_DIRS_JSON=""
ARTIFACTS_PATH=".terraform-artifacts"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --changed-dirs)
      CHANGED_DIRS_JSON="$2"
      shift 2
      ;;
    --artifacts-path)
      ARTIFACTS_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${CHANGED_DIRS_JSON}" || "${CHANGED_DIRS_JSON}" == "[]" ]]; then
  echo "No directories to collect"
  exit 0
fi

mkdir -p "${ARTIFACTS_PATH}"

# Copy .tf, .tfvars, and .terraform.lock.hcl from each changed directory
jq -r '.[].full_path' <<< "${CHANGED_DIRS_JSON}" | while read -r dir; do
  [[ ! -d "${dir}" ]] && continue

  echo "Collecting files from ${dir}"
  mkdir -p "${ARTIFACTS_PATH}/${dir}"

  find "${dir}" -maxdepth 1 \
    \( -name '*.tf' -o -name '*.tfvars' -o -name '.terraform.lock.hcl' \) \
    -exec cp {} "${ARTIFACTS_PATH}/${dir}/" \;
done

echo "artifacts_path=${ARTIFACTS_PATH}" >> "${GITHUB_OUTPUT}"
echo "Collected artifacts:"
ls -R "${ARTIFACTS_PATH}"
