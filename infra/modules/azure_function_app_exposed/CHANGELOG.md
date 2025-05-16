# azure_function_app_exposed

## 1.0.0

### Major Changes

- 50c15f2: TLS 1.3 Upgrade for Azure Function Apps. This change requires azurerm provider version 4.8.0 or higher.

## 0.2.1

### Patch Changes

- 8e6bfa6: Revert "TLS 1.3 Upgrade for Azure Function Apps modules"

## 0.2.0

### Minor Changes

- aae0dc5: TLS 1.3 Upgrade for Azure Function Apps

### Patch Changes

- e73a238: Add module version tag

## 0.1.8

### Patch Changes

- b3254c7: Rename `APPINSIGHTS_CONNECTION_STRING` environment variable.

  This was previously introduced to let the `@pagopa/azure-tracing` package work.

## 0.1.7

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 0.1.6

### Patch Changes

- 66efe11: Add `APPINSIGHTS_CONNECTION_STRING` as an environment variable when application insights is enabled.

  The `APPINSIGHTS_CONNECTION_STRING` is used by the `@pagopa/azure-tracing` package.

## 0.1.5

### Patch Changes

- 625aefe: Replace naming convention module with DX provider functions

## 0.1.4

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.1.3

### Patch Changes

- f17598d: Set up custom warm-up for swap and restart
- 32bb588: Align Host and Worker sample rate in Azure Functions module AI tracing

## 0.1.2

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.1.1

### Patch Changes

- c0ed98d: Add Durable Functions configuration to Azure Function App resources

## 0.1.0

### Minor Changes

- 34c0c5c: Add support to Durable Functions

## 0.0.7

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.6

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.5

### Patch Changes

- 15ecfc1: Removed xs tier because is unsupported

## 0.0.4

### Patch Changes

- 8579691: Fixed xs configuration for App Service, minor for Function App
- 0457561: Fixed cosmos Alert variable, removed old provider configuration and added xs case into functions and app service modules

## 0.0.3

### Patch Changes

- afcf1f2: Added tests for each modules

## 0.0.2

### Patch Changes

- 3b022b9: Examples updated and new standard for locals has been used
