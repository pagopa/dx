# Azure GitHub Environment Bootstrap

## 1.0.1

### Patch Changes

- f9ceaad: Removed `Role Based Access Control Administrator` role from Infra CI identity at resource group level as it is already inherited from subscription

## 1.0.0

### Major Changes

- 0e87be9: The variable `private_dns_zone_resource_group_id` replaces `dns_zone_resource_group_id`. This is going to remove all roles on external DNS zone resource group. Instead, all required roles to manage Private DNS Zone are set, in order to let identities to create, update and delete private endpoints on resources.

  The variable `nat_gateway_resource_group_id` is now optional.

## 0.0.5

### Patch Changes

- 65bd64d: Add Storage Table Data Reader role at resource group level to Infra CI identity

## 0.0.4

### Patch Changes

- fb9f7ac: Add Table Contributor role to Infra CD Identity on resource group scope

## 0.0.3

### Patch Changes

- 9673a34: Add roles to associate NAT Gateways and subnets to GitHub App CD identity
- 16ecc30: Using a common resource group in terraform tests

## 0.0.2

### Patch Changes

- d0d511b: Added APIM list secrets custom role for infra ci identity
- 5dc3615: Remove roles from Entra ID groups on Terraform Storage Account
- 832811e: Add `Role Based Access Control Administrator` role at subscription scope to Infra CD identity

## 0.0.1

### Patch Changes

- 821abc1: First relase
- 845a530: Break reference to local naming convention module
