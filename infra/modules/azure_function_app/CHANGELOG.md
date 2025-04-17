# azure_function_app

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
