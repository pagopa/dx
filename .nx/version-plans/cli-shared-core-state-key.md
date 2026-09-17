---
"@pagopa/dx-cli": minor
---

Keep the core Terraform state at the root of the state storage account (`core.tfstate`), since the core is shared by every domain using the same prefix. Workspace-scoped states now use the `domain/scope.tfstate` layout, dropping the redundant prefix already implied by the storage account.

When an already initialized environment does not have a `core.tfstate`, `add environment` now warns and asks for the explicit core state key (or accepts `--core-state-key`) to wire into the generated IaC, so workspaces sharing a core stored under a legacy key keep working.
