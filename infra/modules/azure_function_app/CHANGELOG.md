# azure_function_app

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
