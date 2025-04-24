#!/bin/bash

# Script to create or delete secrets in a GitHub repository
# Requires GitHub CLI (gh) already installed and authenticated

# Usage:
# -c, --create, null    Create the secret
# -d, --delete          Delete the secret instead of creating it

# Default mode is create
DELETE_MODE=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--delete) DELETE_MODE=true ;;
        -c|--create) DELETE_MODE=false ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it before proceeding."
    echo "You can install it with: brew install gh"
    exit 1
fi

# Check if the user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "You are not authenticated with GitHub. Please run 'gh auth login' before proceeding."
    exit 1
fi

# Get the current repository
REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\(.*\)\.git/\1/')

if [ -z "$REPO" ]; then
    echo "Could not determine the repository. Make sure you are in a git directory with a GitHub remote."
    exit 1
fi

# If delete mode is enabled, delete the secret and exit
if [ "$DELETE_MODE" = true ]; then
    echo "Deleting secret SP_CREDENTIALS from repository: $REPO"
    gh secret delete SP_CREDENTIALS -R "$REPO"
    
    if [ $? -eq 0 ]; then
        echo "Secret SP_CREDENTIALS deleted successfully!"
    else
        echo "Failed to delete secret SP_CREDENTIALS. Make sure it exists and you have the necessary permissions."
        exit 1
    fi
    
    exit 0
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "Azure CLI (az) is not installed. Please install it before proceeding."
    echo "You can install it following the instructions at: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if the user is authenticated with Azure
if ! az account show &> /dev/null; then
    echo "You are not authenticated with Azure. Please run 'az login' before proceeding."
    exit 1
fi

echo "Creating secrets for repository: $REPO"

# Get the secret value from Azure Key Vault
echo "Retrieving secret from Azure Key Vault..."
KEY_VAULT_NAME="dx-d-itn-common-kv-01"      # <---- CHANGE THIS VALUES AFTER POC
SECRET_NAME="sp-credentials-poc"            # <---- CHANGE THIS VALUES AFTER POC

SECRET_VALUE=$(az keyvault secret show --name "$SECRET_NAME" --vault-name "$KEY_VAULT_NAME" --query "value" -o tsv)

if [ -z "$SECRET_VALUE" ]; then
    echo "Error retrieving secret from Azure Key Vault. Make sure the secret exists and you have the necessary permissions."
    exit 1
fi

# Create a single secret with the value obtained from Azure Key Vault
echo "Creating secret SP_CREDENTIALS..."
gh secret set SP_CREDENTIALS -b "$SECRET_VALUE" -R "$REPO"

echo "Secret created successfully!"
echo "The following secret is now available in the repository:"
echo "- SP_CREDENTIALS"

exit 0
