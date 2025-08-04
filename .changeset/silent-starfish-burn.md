---
"github_environment_bootstrap": major
---

**BREAKING CHANGE**: Add environment support and enhance GitHub Environment Bootstrap module

This release introduces significant enhancements to the GitHub Environment Bootstrap module:

## New Features

- **Multi-environment support**: Added `environments` field to support multiple deployment environments (dev, uat, prod, etc.)
- **Enhanced GitHub environments**: The module now creates GitHub environments for all specified environments with proper deployment policies
- **Improved deployment policies**: Better support for branch and tag-based deployment policies across environments

## Breaking Changes

- **New required field**: The `environments` field is now available in the `repository` variable, defaulting to `["prod"]` for backward compatibility
- **Environment-aware resources**: GitHub environments are now created per environment specified in the `environments` list

## Migration Guide

### Before (v0.x.x)

```hcl
module "github_repository" {
  source = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 0.0"

  repository = {
    name                     = "my-repo"        # required
    description              = "My repository description" # required
    topics                   = ["terraform", "azure"]      # required
    reviewers_teams          = ["my-team"]      # required
    infra_cd_policy_branches = ["main"]         # optional
    opex_cd_policy_branches  = ["main"]         # optional
    app_cd_policy_branches   = ["main"]         # optional
    # environments was not supported
  }
}
```

### After (v1.x.x)

```hcl
module "github_repository" {
  source = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 1.0"

  repository = {
    name                     = "my-repo"        # required
    description              = "My repository description" # required
    topics                   = ["terraform", "azure"]      # required
    reviewers_teams          = ["my-team"]      # required
    infra_cd_policy_branches = ["main"]         # optional
    opex_cd_policy_branches  = ["main"]         # optional
    app_cd_policy_branches   = ["main"]         # optional
    environments             = ["dev", "uat", "prod"] # optional - specify all environments
  }
}
```

### For single environment projects

If you have a single environment project, the default behavior remains the same:

```hcl
module "github_repository" {
  source = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 1.0"

  repository = {
    name                     = "my-repo"        # required
    description              = "My repository description" # required
    topics                   = ["terraform", "azure"]      # required
    reviewers_teams          = ["my-team"]      # required
    infra_cd_policy_branches = ["main"]         # optional
    opex_cd_policy_branches  = ["main"]         # optional
    app_cd_policy_branches   = ["main"]         # optional
    # environments defaults to ["prod"]         # optional
  }
}
```

## New Resources Created

For each environment specified in the `environments` list, the module now creates:

- `github_repository_environment.infra_cd[env]`
- `github_repository_environment.app_cd[env]`
- `github_repository_environment.opex_cd[env]`
- `github_repository_environment.infra_ci[env]`
- `github_repository_environment.opex_ci[env]`

With corresponding deployment policies for branches and tags.

## Migration Steps

1. **Update your module version** to `~> 1.0`
2. **Add the `environments` field** to your repository configuration if you need multiple environments
3. **Run `terraform plan`** to see what new environments will be created
4. **Apply the changes** to create the new environment-specific GitHub environments

If you were previously using this module with the Azure GitHub Environment Bootstrap module, you should follow the migration guide in that module's changelog for the complete migration process.
