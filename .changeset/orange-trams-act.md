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
