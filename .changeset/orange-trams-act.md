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

**Use the dedicated GitHub module**: Use the standalone [`github-environment-bootstrap`](https://registry.terraform.io/modules/pagopa-dx/github-environment-bootstrap/github/latest) module in your `infra/repository/` folder for repository management, while keeping the Azure GitHub Environment Bootstrap module in your `infra/bootstrapper/<env>/` configuration.

```hcl
module "bootstrapper" {
  source = "pagopa-dx/azure-github-environment-bootstrap/azurerm"

  repository = {
    name        = "my-repo"
    description = "My repository description"
    topics      = ["terraform", "azure"]
    configure   = true
    # ... other repository settings
  }
  # ... other variables
}
```

```hcl
module "github_repository" {
  source = "pagopa-dx/github-environment-bootstrap/github"

  repository = {
    name        = "my-repo"
    description = "My repository description"
    topics      = ["terraform", "azure"]
    # ... other repository settings
  }
}

module "bootstrapper" {
  source = "pagopa-dx/azure-github-environment-bootstrap/azurerm"

  repository = {
    name            = "my-repo"
    reviewers_teams = ["my-team"]
    # ... only deployment policy settings
  }
  # ... other variables
}
```
