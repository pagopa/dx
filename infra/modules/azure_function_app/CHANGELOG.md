# azure_function_app

## 1.0.1

### Patch Changes

- 1e70ca0: Revert from TLS `1.3` to TLS `1.2` for app service and function app modules, added new variable named tls_version with default `1.2`.

  Ref.: [Azure API Management throwing error in connecting to backend which requires minimum TLS 1.3](https://learn.microsoft.com/en-us/answers/questions/2125989/azure-api-management-throwing-error-in-connecting)

## 1.0.0

### Major Changes

- 50c15f2: TLS 1.3 Upgrade for Azure Function Apps. This change requires azurerm provider version 4.8.0 or higher.

## 0.3.1

### Patch Changes

- 8e6bfa6: Revert "TLS 1.3 Upgrade for Azure Function Apps modules"

## 0.3.0

### Minor Changes

- aae0dc5: TLS 1.3 Upgrade for Azure Function Apps

### Patch Changes

- e73a238: Add module version tag

## 0.2.9

### Patch Changes

- b3254c7: Rename `APPINSIGHTS_CONNECTION_STRING` environment variable.

  This was previously introduced to let the `@pagopa/azure-tracing` package work.

## 0.2.8

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 0.2.7

### Patch Changes

- 66efe11: Add `APPINSIGHTS_CONNECTION_STRING` as an environment variable when application insights is enabled.

  The `APPINSIGHTS_CONNECTION_STRING` is used by the `@pagopa/azure-tracing` package.

## 0.2.6

### Patch Changes

- 625aefe: Replace naming convention module with DX provider functions

## 0.2.5

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.2.4

### Patch Changes

- d1a6a1c: Fix visibility of app settings containing sensitive values in Terraform Plan

## 0.2.3

### Patch Changes

- f17598d: Set up custom warm-up for swap and restart
- 32bb588: Align Host and Worker sample rate in Azure Functions module AI tracing

## 0.2.2

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.2.1

### Patch Changes

- c0ed98d: Add Durable Functions configuration to Azure Function App resources

## 0.2.0

### Minor Changes

- 34c0c5c: Add support to Durable Functions

## 0.1.3

### Patch Changes

- 42de6f4: Fix an issue where the app setting ´APPINSIGHTS_SAMPLING_PERCENTAGE´ was not set when using ´var.application_insights_key´ instead of ´var.application_insights_connection_string´

## 0.1.2

### Patch Changes

- 3152f40: Variable subnet_cidr is no longer required when a value for subnet_id is provided

## 0.1.1

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.1.0

### Minor Changes

- 7c0cb16: Add variable to use an existing subnet instead of creating a new one

## 0.0.6

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.5

### Patch Changes

- 15ecfc1: Removed xs tier because is unsupported
- 757fd7b: Added var for application insight key

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
