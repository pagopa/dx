#!/bin/bash

# Function to display usage instructions
usage() {
  echo "Usage: ./add-module.sh --name <module-name> --description <brief-module-description> [--gh-org <organization>] [--provider <provider>]"
  exit 1
}

# Default provider if not 
ORG_NAME="pagopa"
PROVIDER="azurerm"

# Parse named arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --name) MODULE_NAME="$2"; shift ;;
    --description) DESCRIPTION="$2"; shift ;;
    --gh-org) ORG_NAME="$2"; shift ;;
    --provider) PROVIDER="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; usage ;;
  esac
  shift
done

# Check if the module name was provided
if [ -z "$MODULE_NAME" ]; then
  echo "Error: No module name provided."
  usage
fi

DX_PREFIX="dx"
SUBREPO_NAME="terraform-$PROVIDER-${DX_PREFIX}-${MODULE_NAME}"
SUBREPO_NAME=${SUBREPO_NAME//_/\-}
MODULE_DIR="infra/modules/$MODULE_NAME"

# Create the module directory if it doesn't exist
if [ ! -d "$MODULE_DIR" ]; then
  mkdir -p "$MODULE_DIR"
  echo "Module directory '$MODULE_DIR' created."
else
  echo "Module '$MODULE_NAME' already exists in the 'modules' folder. Skipping folder creation."
fi

# Create package.json if it doesn't exist
PACKAGE_JSON="$MODULE_DIR/package.json"
if [ ! -f "$PACKAGE_JSON" ]; then
  cat <<EOL > "$PACKAGE_JSON"
{
  "name": "$MODULE_NAME",
  "version": "0.0.1",
  "private": true,
  "provider": "$PROVIDER",
  "description": "$DESCRIPTION"
}
EOL
  echo "package.json created in '$MODULE_DIR'."
else
  echo "package.json already exists in '$MODULE_DIR'. Skipping file creation."
fi

# Handle GitHub repository creation or update
echo "Checking GitHub repository status."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Please install it first."
  exit 1
fi

# Check if the repository already exists
if gh repo view "$ORG_NAME/$SUBREPO_NAME" &> /dev/null; then
  echo "Repository '$ORG_NAME/$SUBREPO_NAME' already exists on GitHub. Updating description..."
  gh repo edit "$ORG_NAME/$SUBREPO_NAME" --description "$DESCRIPTION"
  echo "Description updated to: $DESCRIPTION"
else
  # Confirm before creating the GitHub repository
  read -p "Do you want to create the GitHub repository '$SUBREPO_NAME' in organization '$ORG_NAME'? (y/n): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Repository creation canceled."
    exit 0
  fi
  echo "Creating GitHub repository '$SUBREPO_NAME' in organization '$ORG_NAME'..."
  gh repo create "$ORG_NAME/$SUBREPO_NAME" --public --confirm --description "$DESCRIPTION"

  if [ $? -eq 0 ]; then
    echo "GitHub repository created successfully: https://github.com/$ORG_NAME/$SUBREPO_NAME"
    
    # Add dx-pagopa-bot as a collaborator with admin permissions
    gh api -X PUT /repos/$ORG_NAME/$SUBREPO_NAME/collaborators/dx-pagopa-bot -f permission=admin
  else
    echo "Error: Failed to create GitHub repository."
    exit 1
  fi
  # Push the module to the repository
  cd "$MODULE_DIR"
  if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/$ORG_NAME/$SUBREPO_NAME.git
    cat <<EOL > .gitignore
.terraform/
.terraform.lock.hcl
*.tfstate
*.tfstate.backup
EOL
    git add .gitignore
    git add .
    git commit -m "Initial commit for module $MODULE_NAME"
    git branch -M main
    git push -u origin main
    rm .gitignore
    echo "Module '$MODULE_NAME' pushed to GitHub repository."
  else
    echo "Module '$MODULE_NAME' already has a Git repository. Skipping initialization."
  fi
fi
