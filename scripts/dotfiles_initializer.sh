#!/bin/sh
set -eu

# Function to download a file and display progress
download_file() {
  local url=$1
  local file_name=$(basename "$url")
  echo "Downloading $file_name..."
  if curl -O "$url"; then
    echo "$file_name downloaded successfully."
  else
    echo "Error downloading $file_name. Exiting."
    exit 1
  fi
  echo
  echo
}

# .terraform-version
download_file "https://raw.githubusercontent.com/pagopa/dx-typescript/refs/heads/main/.terraform-version"

# .gitignore
download_file "https://raw.githubusercontent.com/pagopa/dx-typescript/refs/heads/main/.gitignore"

# .pre-commit-config.yaml
download_file "https://raw.githubusercontent.com/pagopa/dx-typescript/refs/heads/main/.pre-commit-config.yaml"

# .editorconfig
download_file "https://raw.githubusercontent.com/pagopa/dx-typescript/refs/heads/main/.editorconfig"

# .tflint.hcl
download_file "https://raw.githubusercontent.com/pagopa/dx-typescript/refs/heads/main/.tflint.hcl"

# .trivyignore
download_file "https://raw.githubusercontent.com/pagopa/dx-typescript/refs/heads/main/.trivyignore"

echo "All files downloaded successfully."
