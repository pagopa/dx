# azure_core_infra

## 2.1.4

### Patch Changes

- b3293b3: Add DNS Private Zone for API Management

## 2.1.3

### Patch Changes

- d75ce50: Address two issues with generated names:
  - `instance_number` variable was not used to generate resource name, causing all instances to have the same name when multiple instances were created
    - affected components: VPN Gateway and NAT Gateway
  - the Entra ID application name was not using the `prefix` variable, replaced by `dx` hardcoded value
    - affected components: VPN Gateway

## 2.1.2

### Patch Changes

- 8635473: Disable purge protection on KeyVault created in non-prod environment

## 2.1.1

### Patch Changes

- 9ffff21: Resolved typos inside examples

## 2.1.0

### Minor Changes

- c93e73f: Add application insights resource

## 2.0.0

### Major Changes

- a08a2c9: Remove CIDR variables, found automatically with pagopa-dx found cidr resource

## 1.0.10

### Patch Changes

- 9b8c061: Add opex resource group

## 1.0.9

### Patch Changes

- 2c0cd45: Add log analytics workspace and resource groups ids outputs

## 1.0.8

### Patch Changes

- dd9a39d: Remove Application Insights private DNS zones. The simple addition of these dns zones makes public application insights unreachable.

## 1.0.7

### Patch Changes

- e73a238: Add module version tag

## 1.0.6

### Patch Changes

- 80e7bd3: Add azure monitor private link service private dns zones

## 1.0.5

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.4

### Patch Changes

- d6f755a: Replace naming convention module with provider functions

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
