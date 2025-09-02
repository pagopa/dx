# Azure GitHub Environment Bootstrap

## 3.0.1

### Patch Changes

- 1b59a77: Move relevant documentation sections between azure-github-environment-bootstrap and github-environment-bootstrap modules documentation

## 3.0.0

### Major Changes

- 2cc91e0: **BREAKING CHANGE**: Remove GitHub repository management from Azure GitHub Environment Bootstrap module

  This release introduces significant breaking changes to the Azure GitHub Environment Bootstrap module:
  - **Removed `github_repository` module**: The module no longer manages GitHub repository configuration
  - **Removed repository configuration fields**: The following fields have been removed from the `repository` variable:
    - `description`
    - `topics`
    - `default_branch_name`
    - `jira_boards_ids`
    - `configure`
    - `pages_enabled`
    - `has_downloads`
    - `has_projects`
    - `homepage_url`
    - `pull_request_bypassers`

  The `repository` variable now only contains fields essential for GitHub environment and deployment policy management:
  - `owner` (optional, defaults to "pagopa")
  - `name` (required)
  - `reviewers_teams` (required)
  - `infra_cd_policy_branches`, `opex_cd_policy_branches`, `app_cd_policy_branches`
  - `infra_cd_policy_tags`, `opex_cd_policy_tags`, `app_cd_policy_tags`

  If you were relying on this module to manage your GitHub repository configuration, you must now use the dedicated GitHub module for repository management.

  ## Migration Guide

  To migrate from the previous version, you need to split the configuration between two modules:

  ### Before (v2.x.x)

  ```hcl
  # infra/bootstrapper/<env>/main.tf
  module "bootstrapper" {
    source = "../_modules/bootstrapper"

    repository = {
      name                     = "dx"                                               # required
      configure                = true                                              # optional
      description              = "Devex repository for shared tools and pipelines." # required
      topics                   = ["developer-experience"]                         # required
      reviewers_teams          = ["engineering-team-devex"]                       # required
      pages_enabled            = true                                              # optional
      has_downloads            = true                                              # optional
      has_projects             = true                                              # optional
      homepage_url             = "https://pagopa.github.io/dx/docs/"               # optional
      pull_request_bypassers   = ["/dx-pagopa-bot"]                               # optional
      infra_cd_policy_branches = ["main"]                                         # optional
      opex_cd_policy_branches  = ["main"]                                         # optional
      app_cd_policy_branches   = ["main"]                                         # optional
    }

    ... # other variables remain unchanged

    tags = local.tags
  }
  ```

  ### After (v3.x.x)

  ```hcl
  # infra/repository/main.tf (NEW FILE)
  module "github_repository" {
    source = "pagopa-dx/github-environment-bootstrap/github"
    version = "~> 1.0"

    repository = {
      name                     = "dx"                                # required
      description              = "Devex repository for shared tools and pipelines." # required
      topics                   = ["developer-experience"]          # required
      reviewers_teams          = ["engineering-team-devex"]         # required
      pages_enabled            = true                               # optional
      has_downloads            = true                               # optional
      has_projects             = true                               # optional
      homepage_url             = "https://pagopa.github.io/dx/docs/" # optional
      pull_request_bypassers   = ["/dx-pagopa-bot"]                 # optional
      infra_cd_policy_branches = ["main"]                          # optional
      opex_cd_policy_branches  = ["main"]                          # optional
      app_cd_policy_branches   = ["main"]                          # optional
      environments             = ["prod"] # Or ["dev", "uat", "prod"] for multi-env # optional
    }
  }
  ```

  ```hcl
  # infra/bootstrapper/<env>/main.tf (UPDATED)
  module "bootstrapper" {
    source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
    version = "~> 3.0"

    repository = {
      owner = "pagopa"  # optional, defaults to "pagopa"
      name  = "dx"      # required - must match the repository name in github module
    }

    ... # other variables remain unchanged

    tags = local.tags
  }
  ```

  ### Migration Steps

  #### Option 1: Automated Migration (Recommended)

  Use our automated migration script to handle the migration automatically:

  ```bash
  # Run the unified migration script via npx
  npx https://gist.github.com/dx-pagopa-bot/923e0a6354c34a0e50c1e54de8f14333

  # Or run with dry-run to preview changes first
  npx https://gist.github.com/dx-pagopa-bot/923e0a6354c34a0e50c1e54de8f14333 --dry-run
  ```

  The script will automatically:
  - Detect which migration is needed (Azure split, GitHub environment support, or both)
  - Parse your existing bootstrapper configurations
  - Create the new `infra/repository/` module (if needed)
  - Update your configurations to the new format
  - Initialize the repository module with `terraform init`
  - Check the result of `terraform plan` in both the bootstrapper and repository modules
  - Verify that there are no changes apart from state imports and removals

  #### Option 2: Manual Migration
  1. **Create a new `infra/repository/` directory** in your project root
  2. **Create `infra/repository/main.tf`** with the GitHub module configuration (see example above)
  3. **Create `infra/repository/versions.tf`** with required providers:

     ```hcl
     terraform {
       required_providers {
         github = {
           source  = "integrations/github"
           version = "~> 6.0"
         }
       }
     }

     provider "github" {
       owner = "pagopa"
     }
     ```

  4. **Update your bootstrapper module configuration** to only include `owner` and `name` in the repository variable
  5. **Run `terraform init`** in the new `infra/repository/` directory
  6. **Import existing GitHub resources** to the new module:

     ```bash
     cd infra/repository

     # Import the main GitHub repository
     terraform import 'module.github_repository.github_repository.this' your-repo-name

     # Import GitHub environments (uncomment and run the ones that exist):
     # Production environments:
     # terraform import 'module.github_repository.github_repository_environment.infra_cd["prod"]' your-repo-name:infra-prod-cd
     # terraform import 'module.github_repository.github_repository_environment.app_cd["prod"]' your-repo-name:app-prod-cd
     # terraform import 'module.github_repository.github_repository_environment.opex_cd["prod"]' your-repo-name:opex-prod-cd

     # Development environments (if you have them):
     # terraform import 'module.github_repository.github_repository_environment.infra_cd["dev"]' your-repo-name:infra-dev-cd
     # terraform import 'module.github_repository.github_repository_environment.app_cd["dev"]' your-repo-name:app-dev-cd
     # terraform import 'module.github_repository.github_repository_environment.opex_cd["dev"]' your-repo-name:opex-dev-cd

     # UAT environments (if you have them):
     # terraform import 'module.github_repository.github_repository_environment.infra_cd["uat"]' your-repo-name:infra-uat-cd
     # terraform import 'module.github_repository.github_repository_environment.app_cd["uat"]' your-repo-name:app-uat-cd
     # terraform import 'module.github_repository.github_repository_environment.opex_cd["uat"]' your-repo-name:opex-uat-cd
     ```

  7. **Run `terraform plan`** to verify the migration - there should be no changes to the repository itself
  8. **Apply the changes** in the repository directory first, then update the bootstrapper

  **Important**: The GitHub environments and deployment policies that were previously managed by the Azure module are now handled by the GitHub module. Make sure to import all existing environments to avoid recreating them.

  ### Troubleshooting
  - If you encounter issues applying `github_environment_deployment_policy` resources, please use the GitHub UI to remove them manually. This is a known issue with the GitHub provider. To do so, navigate to the repository's "Settings" > "Environments", select the environment, and delete the deployment policy ("Deployment branches and tags" section). On the next `terraform apply`, the resource will be recreated without issues.

## 2.4.4

### Patch Changes

- 808481e: Update default values for GitHub runner vCPU and Memory

## 2.4.3

### Patch Changes

- ad75e08: Replace Key Vault Crypto User with Key Vault Crypto Officer role for Infra CI identity to allow to read keys rotation policies

## 2.4.2

### Patch Changes

- a08a2c9: Update some configuration with new optional variables

## 2.4.1

### Patch Changes

- 4623f67: Output the CI/CD principals' ids

## 2.4.0

### Minor Changes

- 716b0f6: Add Container Apps Contributor role at resource groups scope

## 2.3.1

### Patch Changes

- b4081c8: Improved module documentation. It now contains examples about setup customization
- 91515f8: Update Readme with some information about required Azure Permissions

## 2.3.0

### Minor Changes

- fad5db7: App CD Identity is now CDN Profile Contributor in team resource groups

## 2.2.0

### Minor Changes

- 33ecfc7: Two changes to App CD Identity roles in team resource groups:
  - It is now Blob Data Contributor to allow CDN deployments
  - It is not Contributor anymore, but Website Contributor instead

## 2.1.0

### Minor Changes

- 4f9dbdf: Add optional variable to set roles to a common Service Bus Namespace

## 2.0.1

### Patch Changes

- e73a238: Add module version tag

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
