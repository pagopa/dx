# Azure GitHub Environment Bootstrap

## 2.0.0

### Major Changes

- d6f3537: The Azure Github environment bootstrap now uses the private module Github environment bootstrap
  to configure the repository, default branch and branch protection.

  To migrate seamlessly from version v1 to v2, you'll need to include these moved blocks in your root module:

  ```
  moved {
    from = module.repo.github_repository.this
    to   = module.repo.module.github_repository["repo"].github_repository.this
  }

  moved {
    from = module.repo.github_branch_default.main
    to = module.repo.module.github_repository["repo"].github_branch_default.main
  }

  moved {
    from = module.repo.github_branch_protection.main
    to   = module.repo.module.github_repository["repo"].github_branch_protection.main
  }
  ```

  Please note: `module.repo` must be adapted with the name used in your configuration.
  For example:

  ```
  module "repository" {
    source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
    version = "~> 1.0"

    environment = {
    ...
  ```

  The moved blocks will start with `module.repository...`

## 1.5.2

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.5.1

### Patch Changes

- 7895612: Fix Container Apps Contributor role assignment to Infra CD identity

## 1.5.0

### Minor Changes

- eddd16d: Add support for Container Apps

## 1.4.1

### Patch Changes

- c534615: Replace naming convention module with DX provider functions

## 1.4.0

### Minor Changes

- 21341a4: Add variables to control GitHub runner timeout and support to KeyVaults using RBAC

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 1.3.0

### Minor Changes

- 6ef0285: Add Log Analytics Workspace role assignment

## 1.2.0

### Minor Changes

- 133aa87: Add `jira_boards_ids` parameter

  This parameter allows the creation of an [autolink reference](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/configuring-autolinks-to-reference-external-resources)
  for every board id provided.

## 1.1.1

### Patch Changes

- 9075297: Add documentation in README

## 1.1.0

### Minor Changes

- f4748cd: Add an optional variable to accept a list of resource group to apply IAM roles to

## 1.0.2

### Patch Changes

- 3fdcf68: Set `PR_BODY` as commit message when squashing

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
