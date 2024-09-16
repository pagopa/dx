#!/bin/bash

# Function to display usage instructions
usage() {
  echo "Usage: ./add-module.sh --name <module-name> [--gh-org <organization>]"
  exit 1
}

# Parse named arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --name) MODULE_NAME="$2"; shift ;;
    --gh-org) ORG_NAME="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; usage ;;
  esac
  shift
done

# Check if the module name was provided
if [ -z "$MODULE_NAME" ]; then
  echo "Error: No module name provided."
  usage
fi

PROVIDER="azurerm" # we may support different providers as aws, awscc, etc.
SUFFIX="dx"
SUBREPO_NAME="terraform-$PROVIDER-$SUFFIX-$MODULE_NAME"
MODULE_DIR="modules/$MODULE_NAME"

# Check if the module directory already exists
if [ -d "$MODULE_DIR" ]; then
  echo "Error: Module '$MODULE_NAME' already exists in the 'modules' folder."
  exit 1
fi

# Create the module directory
mkdir -p "$MODULE_DIR"

# Create package.json file in the module directory
PACKAGE_JSON="$MODULE_DIR/package.json"
cat <<EOL > "$PACKAGE_JSON"
{
  "name": "$MODULE_NAME",
  "version": "0.0.1",
  "private": true
}
EOL

# Provide feedback
echo "Module '$MODULE_NAME' has been created in the 'modules'."

# If --gh-org was passed, ask for confirmation to create the GitHub repository
if [ -n "$ORG_NAME" ]; then
  echo "--gh-org parameter detected. Assuming you want to create a GitHub repository."
  read -p "Do you want to create the GitHub repository for this module? (y/n): " CREATE_REPO
  if [[ "$CREATE_REPO" != "y" && "$CREATE_REPO" != "Y" ]]; then
    echo "GitHub repository creation canceled."
    exit 0
  fi

  # Check if GitHub CLI is installed
  if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it first."
    exit 1
  fi

  # Create the GitHub repository under the specified organization
  echo "Creating GitHub repository '$SUBREPO_NAME' in organization '$ORG_NAME'..."
  gh repo create "$ORG_NAME/$SUBREPO_NAME" --public --confirm

  if [ $? -eq 0 ]; then
    echo "GitHub repository created successfully: https://github.com/$ORG_NAME/$SUBREPO_NAME"    # Initialize Git in the module directory and push to the new repository
    cd "$MODULE_DIR"
    git init
    git remote add origin git@github.com:$ORG_NAME/$SUBREPO_NAME.git
    git add .
    git commit -m "Initial commit for module $MODULE_NAME"
    git branch -M main
    git push -u origin main
    rm -rf .git
  else
    echo "Error: Failed to create GitHub repository."
    exit 1
  fi
else
  echo "No --gh-org parameter passed. Skipping GitHub repository creation."
fi