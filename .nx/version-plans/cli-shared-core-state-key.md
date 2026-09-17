---
"@pagopa/dx-cli": minor
---

Keep the shared core Terraform state at the root of the state storage account (`core.tfstate`) instead of scoping it to the workspace domain, since the core is shared by every domain using the same prefix.

When an already initialized environment does not have a `core.tfstate`, `add environment` now warns and asks for the explicit core state key to wire into the generated IaC, so workspaces sharing a core stored under a legacy key keep working.
