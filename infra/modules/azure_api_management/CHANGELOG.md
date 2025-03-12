# azure_api_management

## 1.0.0

### Major Changes

- 7e82050: Replace `instrumentation_key` with `connection_string` to connect Application Insights

  **Migration Guide**

  Update the `application_insights` block by replacing the `instrumentation_key` with the `connection_string` parameter.

  From this:

  ```
  module "apim" {
    source  = "pagopa/dx-azure-api-management/azurerm"
    ...
    application_insights = {
      enabled             = true
      instrumentation_key = "<the-ai-instrumentation-key>"
    }
  }
  ```

  to this:

  ```
  module "apim" {
    source  = "pagopa/dx-azure-api-management/azurerm"
    ...
    application_insights = {
      enabled           = true
      connection_string = "<the-ai-connection-string>"
    }
  }
  ```

### Patch Changes

- 525585b: Create APIM logger when AI is enabled
- 9570654: Add `resource_id` attribute when creating the APIM logger

  ## NOTE

  It is possible to use this module's version even if you omit the `id` parameter within the `application_insights` block.

  If you add the `id`, this will force the recreation of the Logger resource. If you have some reference to the Logger instance, you should use the `logger_id` output provided by the module.

- 76eaa55: Set the minimum version of Azure provider to `4.1.0`

## 0.0.8

### Patch Changes

- f092cf0: Add minimum version for APIM control plane REST APIs

## 0.0.7

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.0.6

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.5

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.4

### Patch Changes

- e10ab11: Added enable_public_network_access variable for APIM module

## 0.0.3

### Patch Changes

- afcf1f2: Added tests for each modules

## 0.0.2

### Patch Changes

- e4890b1: Added examples and removed required version for terraform
- 3b022b9: Examples updated and new standard for locals has been used
