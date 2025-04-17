# azure_app_service

## 0.1.9

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 0.1.8

### Patch Changes

- 66efe11: Add `APPINSIGHTS_CONNECTION_STRING` as an environment variable when application insights is enabled.

  The `APPINSIGHTS_CONNECTION_STRING` is used by the `@pagopa/azure-tracing` package.

## 0.1.7

### Patch Changes

- 7edba50: Replace naming convention module with DX provider functions

## 0.1.6

### Patch Changes

- 6421087: Add module documentation in README files

## 0.1.5

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.1.4

### Patch Changes

- f17598d: Set up custom warm-up for swap and restart

## 0.1.3

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.1.2

### Patch Changes

- 3152f40: Variable subnet_cidr is no longer required when a value for subnet_id is provided

## 0.1.1

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.1.0

### Minor Changes

- 7c0cb16: Add variable to use an existing subnet instead of creating a new one

## 0.0.7

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.6

### Patch Changes

- 5c46e66: Set app command line for java applications
- 3b9baf7: Adding to outputs the recordsets pointing to app services' private endpoint

## 0.0.5

### Patch Changes

- ced44ee: Set required java_server and java_server_version parameters for java stack applications
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
