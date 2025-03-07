#!/bin/bash

# Define color codes
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
NC="\033[0m" # No color

# Function to display usage instructions
usage() {
  echo -e "${YELLOW}Usage:${NC} ./add-module.sh --name <module-name> --description <brief-module-description> [--provider <provider>]"
  exit 1
}

# Default provider and GH organization if not provided
ORG_NAME="pagopa-dx"
PROVIDER="azurerm"

# Parse named arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --name) MODULE_NAME="$2"; shift ;;
    --description) DESCRIPTION="$2"; shift ;;
    --provider) PROVIDER="$2"; shift ;;
    *) echo -e "${RED}Unknown parameter passed: $1${NC}"; usage ;;
  esac
  shift
done

# Check if the module name was provided
if [ -z "${MODULE_NAME}" ]; then
  echo -e "${RED}Error: No module name provided.${NC}"
  usage
fi

# Check if the description was provided
if [ -z "${DESCRIPTION}" ]; then
  echo -e "${RED}Error: No description provided.${NC}"
  usage
fi

SUBREPO_NAME="terraform-${PROVIDER}-${MODULE_NAME}"
SUBREPO_NAME=${SUBREPO_NAME//_/\-}
MODULE_DIR="infra/modules/${MODULE_NAME}"

# Create the module directory if it doesn't exist
if [ ! -d "${MODULE_DIR}" ]; then
  mkdir -p "${MODULE_DIR}"
  echo -e "${GREEN}Module directory '${MODULE_DIR}' created.${NC}"
else
  echo -e "${YELLOW}Module '${MODULE_NAME}' already exists in the 'modules' folder. Skipping folder creation.${NC}"
fi

# Create package.json if it doesn't exist
PACKAGE_JSON="${MODULE_DIR}/package.json"
if [ ! -f "${PACKAGE_JSON}" ]; then
  cat <<EOL > "${PACKAGE_JSON}"
{
  "name": "${MODULE_NAME}",
  "version": "0.0.1",
  "private": true,
  "provider": "${PROVIDER}",
  "description": "${DESCRIPTION}"
}
EOL
  echo -e "${GREEN}package.json created in '${MODULE_DIR}'. Running yarn install to update the lock.${NC}"
  yarn install
else
  echo -e "${YELLOW}package.json already exists in '${MODULE_DIR}'. Skipping file creation.${NC}"
fi

# Handle GitHub repository creation or update
echo -e "${YELLOW}Checking GitHub repository status.${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo -e "${RED}Error: GitHub CLI (gh) is not installed. Please install it first.${NC}"
  exit 1
fi

# Check if the repository already exists
if gh repo view "${ORG_NAME}/${SUBREPO_NAME}" &> /dev/null; then
  echo -e "${GREEN}Repository '${ORG_NAME}/${SUBREPO_NAME}' already exists on GitHub. Updating description...${NC}"
  gh repo edit "${ORG_NAME}/${SUBREPO_NAME}" --description "${DESCRIPTION}"
  echo -e "${GREEN}Description updated to: ${DESCRIPTION}${NC}"
else
  # Confirm before creating the GitHub repository
  read -p "$(echo -e "${YELLOW}Do you want to create the GitHub repository '${SUBREPO_NAME}' in organization '${ORG_NAME}'? (y/n): ${NC}")" CONFIRM
  if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
    echo -e "${YELLOW}Repository creation canceled.${NC}"
    exit 0
  fi
  echo -e "${YELLOW}Creating GitHub repository '${SUBREPO_NAME}' in organization '${ORG_NAME}'...${NC}"
  gh repo create "${ORG_NAME}/${SUBREPO_NAME}" --public --confirm --description "${DESCRIPTION}"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}GitHub repository created successfully: https://github.com/${ORG_NAME}/${SUBREPO_NAME}${NC}"
    
    # Add dx-pagopa-bot as a collaborator with admin permissions
    gh api -X PUT /repos/${ORG_NAME}/${SUBREPO_NAME}/collaborators/dx-pagopa-bot -f permission=admin
  else
    echo -e "${RED}Error: Failed to create GitHub repository.${NC}"
    exit 1
  fi
  # Push the module to the repository
  cd "${MODULE_DIR}"
  if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/${ORG_NAME}/${SUBREPO_NAME}.git
    cat <<EOL > .gitignore
.terraform/
.terraform.lock.hcl
*.tfstate
*.tfstate.backup
EOL
    git add .gitignore
    git add .
    git commit -m "Initial commit for module ${MODULE_NAME}"
    git branch -M main
    git push -u origin main
    rm .gitignore
    echo -e "${GREEN}Module '${MODULE_NAME}' pushed to GitHub repository.${NC}"
    echo -e "${YELLOW}Please, ask the DevEx members to add the new repository to the dx-pagopa-bot PAT and on eng-github-authorization repo.${NC}"
    echo -e "${YELLOW}The creation of a changeset is required to produce the first release. Please run yarn changeset from the root of the repo.${NC}"
  else
    echo -e "${YELLOW}Module '${MODULE_NAME}' already has a Git repository. Skipping initialization.${NC}"
  fi
fi
