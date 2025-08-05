---
"azure_github_environment_bootstrap": major
---

**BREAKING CHANGE**: Remove GitHub repository management from Azure GitHub Environment Bootstrap module

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
# infra/bootstrapper/<env>/<env>.tf
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
# infra/bootstrapper/<env>/<env>.tf (UPDATED)
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
6. **Import existing GitHub repository** to the new module:
   ```bash
   cd infra/repository
   terraform import 'module.github_repository.github_repository.this' your-repo-name
   ```
7. **Run `terraform plan`** to verify the migration - there should be no changes to the repository itself
8. **Apply the changes** in the repository directory first, then update the bootstrapper

**Important**: The GitHub environments and deployment policies that were previously managed by the Azure module are now handled by the GitHub module. If you have existing environments, you may need to import them as well.
