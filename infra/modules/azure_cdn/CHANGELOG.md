# azure_cdn

## 0.5.1

### Patch Changes

- 7bb2917: Remove the old tests in favor of the new ones (contracts, integration, and e2e). Fix a typo on the `custom_certificate` and add `destroy` and `update` timeouts for the `frontdoor_profile` resource.

## 0.5.0

### Minor Changes

- c10bec8: Add support for existing CDN profiles, WAF policies, and managed identity for origins
  - Add `existing_cdn_frontdoor_profile_id` variable to reuse existing profiles
  - Add `waf_enabled` variable to create and attach WAF firewall policies
  - Add `use_managed_identity` and `storage_account_id` fields to origins for managed identity authentication with automatic RBAC assignment. **Note:** This feature is currently in preview and disabled by validation. It will be enabled once the feature becomes generally available. See [Azure documentation](https://learn.microsoft.com/en-us/azure/frontdoor/origin-authentication-with-managed-identities) for more information.

## 0.4.0

### Minor Changes

- 7bdef8f: Update diagnostic settings configuration, add new tests, align example

## 0.3.3

### Patch Changes

- 5a57729: Document supported CDN origins and usage
- 7927885: Added endpoint_name output

## 0.3.2

### Patch Changes

- 07b1dc1: Add endpoint_id output

## 0.3.1

### Patch Changes

- bc9645d: Fix terraform test with new Storage Account module version

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
