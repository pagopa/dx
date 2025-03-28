# azure_core_infra

## 1.0.3

### Patch Changes

- 0ceea35: Update Core Infra module README.md to follow guide lines

## 1.0.2

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 1.0.1

### Patch Changes

- d29a1f4: Add azure container app private DNS zone support

## 1.0.0

### Major Changes

- 23c8afe: Replace azurermv3 support with azurermv4

  ## Migration guide

  Update your Terraform configuration from azurerm v3 to azurerm v4, and make sure your Terraform version is above or equal to 1.9.

  Remember that azurerm v4 requires you to set in your local CLI profile the following environment variable:

  - `ARM_SUBSCRIPTION_ID`: with the id of the subscription you want to work with

## 0.0.5

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests
- 0fc4eec: Added tier variable into cosmos account module
- 145a6b9: Fixed naming convention for runner and added new example for develop environment with APIM, Cosmos and storage

## 0.0.4

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.3

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.2

### Patch Changes

- a39432e: Added GitHub Runner and Log Analytics configuration

## 0.0.1

### Patch Changes

- b8b6c28: Added common_environment module for base environment
