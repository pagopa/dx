# azure_cdn

## 0.3.0

### Minor Changes

- d55068e: Support apex domains by using custom certificates

## 0.2.0

### Minor Changes

- 40beff1: Added `rule_set_id` output that exposes the Front Door Rule Set ID. This allows users to implement custom rules via the `azurerm_cdn_frontdoor_rule` resource and link them to the rule set provided by the module.

## 0.1.0

### Minor Changes

- 32aae43: The CDN FrontDoor Profile now has a system-assigned managed identity

## 0.0.7

### Patch Changes

- e73a238: Add module version tag
- 835b9ee: Basic example updated making storage account public

## 0.0.6

### Patch Changes

- 9ce888c: Update Test to avoid conflict resources

## 0.0.5

### Patch Changes

- 599f50a: Update README documentation

## 0.0.4

### Patch Changes

- 0f9f624: Replace naming convention module with DX provider functions

## 0.0.3

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.0.2

### Patch Changes

- 852f755: Implement the first version of the azure cdn module
