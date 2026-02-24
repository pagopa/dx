#!/usr/bin/env bash
set -euo pipefail

# Extract directories with generated Terraform files and format for matrix strategy.
# Output (GITHUB_OUTPUT):
#   has_changes         - Whether any .tf files were generated/modified
#   changed_directories - JSON array of {base_path, environment, full_path}

# --- Check for generated .tf files ---

# awk '{print $NF}' handles all git status formats:
#   " M file.tf" → file.tf | "?? file.tf" → file.tf | "R old -> new" → new
CHANGED_TF_FILES=$(git status --porcelain -- '*.tf' | awk '{print $NF}' || echo "")

if [[ -z "${CHANGED_TF_FILES}" ]]; then
  echo "has_changes=false" >> "${GITHUB_OUTPUT}"
  echo "changed_directories=[]" >> "${GITHUB_OUTPUT}"
  echo "No Terraform file changes detected"
  exit 0
fi

echo "has_changes=true" >> "${GITHUB_OUTPUT}"
echo "Changed .tf files:"
echo "${CHANGED_TF_FILES}"

# --- Build matrix JSON from unique directories ---

MATRIX_JSON=$(
  echo "${CHANGED_TF_FILES}" \
    | xargs -I{} dirname {} \
    | sort -u \
    | jq -R -s -c '
        split("\n")
        | map(select(length > 0))
        | map({
            base_path:   (split("/")[:-1] | join("/")),
            environment: (split("/")[-1]),
            full_path:   .
          })
      '
)

echo "changed_directories=${MATRIX_JSON}" >> "${GITHUB_OUTPUT}"
echo "Generated Terraform in directories:"
echo "${MATRIX_JSON}" | jq '.'
