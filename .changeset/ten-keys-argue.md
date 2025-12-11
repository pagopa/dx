---
"github_environment_bootstrap": patch
---

Refactored all `github_repository_environment` resources to use `github_repository.this.name` instead of `var.repository.name` for the repository argument.  
This ensures proper Terraform dependency tracking and resolves issues with resource dependencies.
