---
"azure_github_environment_bootstrap": major
---

The Azure Github environment bootstrap now uses the private module Github environment bootstrap
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
