---
"@pagopa/dx-cli": minor
---

Store the shared core Terraform state at the root of the state storage account (`core.tfstate`) instead of scoping it to the workspace domain, since the core is shared by every domain using the same prefix. Workspace-scoped states now use the `domain/scope.tfstate` layout, dropping the prefix already implied by the storage account name.

Migration: existing workspaces whose core state lives under a legacy key (`<prefix>.core.<env>.tfstate` or `<prefix>/<domain>/core.tfstate`) must move that blob to `core.tfstate` in the same `terraform-state` container before running `add environment` again. Because the storage account is already scoped by prefix and environment, this is a blob rename with no Terraform state rewrite.
