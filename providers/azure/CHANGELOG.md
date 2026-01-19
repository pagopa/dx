# provider-azure

## 0.8.2

### Patch Changes

- b0116b2: Add a new check for the `domain` in the naming convention: it must never be identical to the `name`.
  Also add a control that detects when the name matches the first part of the resource abbreviation and removes the duplicate.
  For example, if `name = kv` for a `key_vault` resource, the final name will not be
  `[prefix]-[environment]-[location]-kv-kv-[instance number]`
  but instead
  `[prefix]-[environment]-[location]-kv-[instance number]`

## 0.8.1

### Patch Changes

- e449c1c: Add abbreviation for API Center (apic) in resource_name function

## 0.8.0

### Minor Changes

- bb20571: Add support for Azure App Configuration abbreviations

## 0.7.1

### Patch Changes

- 1a2e810: Add support for Container Instance abbreviation

## 0.7.0

### Minor Changes

- 277ee38: Add abbreviation for customer key cosmos db no sql

## 0.6.7

### Patch Changes

- 7af2739: Prefix can now be long up to 4 characters instead of strictly 2 characters

## 0.6.6

### Patch Changes

- 4803b50: Added DNS related resources abbreviations

## 0.6.5

### Patch Changes

- cfc44d1: Add APIM pep value for naming convention function

## 0.6.4

### Patch Changes

- 9f34ae2: Add site-to-site VPN resources abbreviations

## 0.6.3

### Patch Changes

- 9f719dd: Fix auth method for CIDR resource from Default to AzureCLI

## 0.6.2

### Patch Changes

- 2b778d0: Add tests to Azure DX Provider for resource name generation and validation.

## 0.6.1

### Patch Changes

- 6c54e98: Update resource_name function documentation

## 0.6.0

### Minor Changes

- faf821b: Add support to Function App's Storage Account Private Endpoints names

## 0.5.0

### Minor Changes

- 5b44af0: Add resource abbreviations for DNS Private Resolvers

## 0.4.0

### Minor Changes

- 913bc67: Add mysql to resource abbreviations

## 0.3.0

### Minor Changes

- e056b94: Add naming convention support for alerts over Service Bus entities

## 0.2.1

### Patch Changes

- e676023: Update README and docs with new resource_name for function and minor fix for cidr resource

## 0.2.0

### Minor Changes

- 69e2b70: Adds support for generating Service Bus names that conform to the naming convention

## 0.1.0

### Minor Changes

- c735a02: Added new resource to retrieve the first available subnet CIDR within a specified Azure Virtual Network

## 0.0.8

### Patch Changes

- 4c64142: Improve resource_name function tests

## 0.0.7

### Patch Changes

- a0a265e: Add managed identity resource type support for resource_name function

## 0.0.6

### Patch Changes

- 53147e6: Fix resource_name function domain parameter adding null value support

## 0.0.5

### Patch Changes

- 222b6a2: Improve resource_name function with italynorth/westeurope values support for location parameter

## 0.0.4

### Patch Changes

- 03edd1a: Add Tests for Provider and Function, fix a typo and add new resources for postgresql and function app

## 0.0.3

### Patch Changes

- 08ea94d: Fix storage account and add new resource type

## 0.0.2

### Patch Changes

- aca8076: Add other resource types into function table
