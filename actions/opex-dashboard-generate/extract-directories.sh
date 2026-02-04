#!/usr/bin/env bash
set -euo pipefail

# Extract directories containing generated Terraform files and format for matrix strategy
# Outputs:
#   Sets GITHUB_OUTPUT: has_changes (boolean), changed_directories (JSON array with base_path, environment, full_path)

# Check if any files were modified in working directory
if [ -z "$(git status --porcelain)" ]; then
  echo "has_changes=false" >> "${GITHUB_OUTPUT}"
  echo "changed_directories=[]" >> "${GITHUB_OUTPUT}"
  echo "No changes detected"
  exit 0
fi

echo "Changes detected:"
git status --short

# Get only .tf files that were just generated (modified in working directory)
CHANGED_TF_FILES=$(git status --porcelain | grep '\.tf$' | awk '{print $2}' || echo "")

if [ -z "${CHANGED_TF_FILES}" ]; then
  echo "has_changes=true" >> "${GITHUB_OUTPUT}"
  echo "changed_directories=[]" >> "${GITHUB_OUTPUT}"
  echo "No Terraform files generated (but other files changed)"
  exit 0
fi

echo "has_changes=true" >> "${GITHUB_OUTPUT}"

# Extract unique directories and split into base_path/environment
CHANGED_DIRS=$(echo "${CHANGED_TF_FILES}" | xargs dirname | sort -u)

MATRIX_JSON="[]"
for dir in ${CHANGED_DIRS}; do
  # Split path: everything except last component is base_path, last component is environment
  BASE_PATH=$(dirname "${dir}")
  ENVIRONMENT=$(basename "${dir}")

  # Handle root directory case
  if [ "${BASE_PATH}" = "." ]; then
    BASE_PATH=""
  fi

  MATRIX_JSON=$(echo "${MATRIX_JSON}" | jq --arg bp "${BASE_PATH}" --arg env "${ENVIRONMENT}" --arg fp "${dir}" \
    '. + [{"base_path": $bp, "environment": $env, "full_path": $fp}]')
done

echo "changed_directories=${MATRIX_JSON}" >> "${GITHUB_OUTPUT}"
echo "Generated Terraform in directories:"
echo "${MATRIX_JSON}" | jq '.'
