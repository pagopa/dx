#!/usr/bin/env bash
set -euo pipefail

# Collect generated Terraform files into a staging directory for artifact upload.
# Inputs (env vars):
#   CHANGED_DIRS_JSON - JSON array of changed directories (from extract-directories.sh)
#   ARTIFACTS_PATH    - Destination directory for collected files (default: .terraform-artifacts)
# Output (GITHUB_OUTPUT):
#   artifacts_path - Path to the collected artifacts directory

ARTIFACTS_PATH="${ARTIFACTS_PATH:-.terraform-artifacts}"

if [[ -z "${CHANGED_DIRS_JSON:-}" || "${CHANGED_DIRS_JSON}" == "[]" ]]; then
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
