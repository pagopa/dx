# azure_core_values_exporter

## 0.4.0

### Minor Changes

- d47051f: Add support for core states with multiple Azure Subscriptions

## 0.3.0

### Minor Changes

- 707b709: Add subscription_id variable

## 0.2.4

### Patch Changes

- a441444: Added subscription_id and tenant_id outputs to the module

  # How to use these values

  These values can be used to configure other Azure resources that require subscription or tenant IDs.
  1. Remove from your configuration:
     ```hcl
     data "azurerm_subscription" "current" {}
     ```
     or
     ```hcl
     data "azurerm_client_config" "current" {}
     ```
  2. Replace:

  ```hcl
  subscription_id = data.azurerm_subscription.current.id
  tenant_id       = data.azurerm_client_config.current.tenant_id
  ```

  with:

  ```hcl
  subscription_id = module.<exporter>.subscription_id
  tenant_id       = module.<exporter>.tenant_id
  ```

## 0.2.3

### Patch Changes

- 707b5cf: Add dns_forwarder outputs

## 0.2.2

### Patch Changes

- 2b751a4: Update references to the new DX website from pagopa.github.io/dx to dx.pagopa.it

## 0.2.1

### Patch Changes

- 1cbe3ca: Add the following outputs about the VPN (common_vpn_snet, vpn_gateway_id, vpn_fqdns, vpn_public_ips)

## 0.2.0

### Minor Changes

- 75e1f98: Make core values exporter modules support other CSP backend

## 0.1.0

### Minor Changes

- c93e73f: Add application insights resource

## 0.0.2

### Patch Changes

- a08a2c9: Update some configuration with new optional variables

## 0.0.1

### Patch Changes

- 4104572: First version
