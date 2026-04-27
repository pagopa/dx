# 4.0.0 (2026-04-22)

### ⚠️  Breaking Changes

- Support only the new VPN SKU `VpnGw2AZ` and remove the previous non-AZ SKUs. `VpnGw2AZ` is now the only supported option and is used by the `default` VPN use case. ([#1658](https://github.com/pagopa/dx/pull/1658))

  ## Migration guide

  Version 4 changes the VPN gateway created by `pagopa-dx/azure-core-infra/azurerm`:

  - In v3, `vpn_use_case = "default"` created a Generation 1 gateway with SKU `VpnGw1`.
  - In v3, `vpn_use_case = "high_availability"` created a Generation 2 gateway with SKU `VpnGw2`.
  - In v3, `vpn_enabled` defaulted to `false`.
  - In v4, only `vpn_use_case = "default"` is supported and it creates a Generation 2 zone-redundant gateway with SKU `VpnGw2AZ`.
  - In v4, `vpn_enabled` defaults to `true`.

  To migrate from v3 to v4:

  1. Update the module version constraint from `~> 3.0` to `~> 4.0`.
  2. Update the `azurerm` provider in the consuming stack to version `4.62.0` or newer.
  3. If you do not want the module to provision a VPN, set `vpn_enabled = false` explicitly in the consuming stack. In v4, omitting this variable enables the VPN by default.
  4. If your configuration sets `vpn_use_case = "high_availability"`, remove it or replace it with `vpn_use_case = "default"`.
  5. Run `terraform init -upgrade` in the stack that consumes the module, then run `terraform plan`.
  6. Review the plan carefully: moving from `VpnGw1` or `VpnGw2` to `VpnGw2AZ` can require changes to the Azure VPN gateway and its related public IPs. If the plan shows a replacement, schedule a maintenance window before applying it.
  7. Apply the plan.

  Example:

  ```hcl
  terraform {
  	required_providers {
  		azurerm = {
  			source  = "hashicorp/azurerm"
  			version = "~> 4.62"
  		}
  	}
  }

  module "azure" {
  	source  = "pagopa-dx/azure-core-infra/azurerm"
  	version = "~> 4.0"

  	environment = local.azure_environment

  	tags = local.tags
  }
  ```

### ❤️ Thank You

- Christian Calabrese

## 3.1.1 (2026-04-02)

### 🩹 Fixes

- Ignore DDoS protection plan in VNet ([#1560](https://github.com/pagopa/dx/pull/1560))

### ❤️ Thank You

- Andrea Grillo
- Copilot @Copilot

## 3.1.0 (2026-04-02)

### 🚀 Features

- The Azure core module now creates the private DNS zone for Managed Redis resources. ([#1555](https://github.com/pagopa/dx/pull/1555))

### ❤️ Thank You

- Andrea Grillo
- Christian Calabrese
- Copilot @Copilot

## 3.0.0

### Major Changes

- 6cd97ee: Migrate GitHub runner Container App Environment (CAE) to Workload Profiles. It will be asked for CAE replacement.

  ## Migration Guide
  - Delete all the jobs hosted on the CAE
  - Apply this new version to replace the Consumption CAE with the new Workload Profile CAE.
  - Re-apply bootstrapper modules in repositories that had the self-hosted runner in the old CAE

## 2.3.2

### Patch Changes

- ada5499: Add delegation to GitHub runner subnet as required by Container App Environment with Workload Profiles

## 2.3.1

### Patch Changes

- 8f7ca94: Align examples

## 2.3.0

### Minor Changes

- 442cb22: Add private endpoint for AppConfiguration service

## 2.2.4

### Patch Changes

- 70fd2a5: Replace azurerm keyvault's deprecated property "enable_rbac_authorization" with "rbac_authorization_enabled"

## 2.2.3

### Patch Changes

- a441444: # How to use these values

  These values can be used to configure other Azure resources that require subscription or tenant IDs.

  If you already use the `azure_core_values_exporter`:
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

## 2.2.2

### Patch Changes

- 707b5cf: Add dns_forwarder outputs

## 2.2.1

### Patch Changes

- 330fce6: Fix virtual network gateway generation and sku

## 2.2.0

### Minor Changes

- eb14f05: Rewrite VPN and DNS forwarder IaC from external module to plain resources

## 2.1.4

### Patch Changes

- b3293b3: Add DNS Private Zone for API Management

## 2.1.3

### Patch Changes

- d75ce50: Address two issues with generated names:
  - `instance_number` variable was not used to generate resource name, causing all instances to have the same name when multiple instances were created
    - affected components: VPN Gateway and NAT Gateway
  - the Entra ID application name was not using the `prefix` variable, replaced by `dx` hardcoded value
    - affected components: VPN Gateway

## 2.1.2

### Patch Changes

- 8635473: Disable purge protection on KeyVault created in non-prod environment

## 2.1.1

### Patch Changes

- 9ffff21: Resolved typos inside examples

## 2.1.0

### Minor Changes

- c93e73f: Add application insights resource

## 2.0.0

### Major Changes

- a08a2c9: Remove CIDR variables, found automatically with pagopa-dx found cidr resource

## 1.0.10

### Patch Changes

- 9b8c061: Add opex resource group

## 1.0.9

### Patch Changes

- 2c0cd45: Add log analytics workspace and resource groups ids outputs

## 1.0.8

### Patch Changes

- dd9a39d: Remove Application Insights private DNS zones. The simple addition of these dns zones makes public application insights unreachable.

## 1.0.7

### Patch Changes

- e73a238: Add module version tag

## 1.0.6

### Patch Changes

- 80e7bd3: Add azure monitor private link service private dns zones

## 1.0.5

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.4

### Patch Changes

- d6f755a: Replace naming convention module with provider functions

## 1.0.3

### Patch Changes

- 0ceea35: Update Core Infra module README.md to follow guide lines

## 1.0.2

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 1.0.1

### Patch Changes

- d29a1f4: Add azure container app private DNS zone support

## 1.0.0

### Major Changes

- 23c8afe: Replace azurermv3 support with azurermv4

  ## Migration guide

  Update your Terraform configuration from azurerm v3 to azurerm v4, and make sure your Terraform version is above or equal to 1.9.

  Remember that azurerm v4 requires you to set in your local CLI profile the following environment variable:
  - `ARM_SUBSCRIPTION_ID`: with the id of the subscription you want to work with

## 0.0.5

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests
- 0fc4eec: Added tier variable into cosmos account module
- 145a6b9: Fixed naming convention for runner and added new example for develop environment with APIM, Cosmos and storage

## 0.0.4

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.3

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.2

### Patch Changes

- a39432e: Added GitHub Runner and Log Analytics configuration

## 0.0.1

### Patch Changes

- b8b6c28: Added common_environment module for base environment
