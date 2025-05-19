# azure_cosmos_account

## 0.1.0

### Minor Changes

- a9fe980: ### Added

  - Cosmos DB SQL role assignment capability. This change allows assigning the "Cosmos DB Built-in Data Reader" and "Cosmos DB Built-in Data Contributor" roles to multiple principals on all cosmos database scope.

  ### Notes

  This change is part of a strategy to reduce the impact of disabling local authentication in the future. The role assignment capability is introduced as optional now, allowing teams to start assigning appropriate roles to their principals. In a future update, these role assignments will become mandatory, as access to Cosmos DB resources will require proper roles once local authentication is disabled.

## 0.0.11

### Patch Changes

- e73a238: Add module version tag

## 0.0.10

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 0.0.9

### Patch Changes

- be7d383: Replace naming convention module with DX provider functions

## 0.0.8

### Patch Changes

- 6488609: Update Cosmos module README.md

## 0.0.7

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.0.6

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests
- 0fc4eec: Added tier variable into cosmos account module

## 0.0.5

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.4

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.3

### Patch Changes

- b251a93: Added tags into private endpoint
- 0457561: Fixed cosmos Alert variable, removed old provider configuration and added xs case into functions and app service modules

## 0.0.2

### Patch Changes

- afcf1f2: Added tests for each modules
- 3f205e6: Cosmos account module implemented
