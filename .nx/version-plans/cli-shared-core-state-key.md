---
"@pagopa/dx-cli": minor
---

Store the shared core Terraform state at the root of the `terraform-state` container (`core.tfstate`) instead of scoping it to the workspace domain, since the core is shared by every domain using the same prefix. Workspace-scoped states now use the `domain/scope.tfstate` layout, dropping the prefix already implied by the storage account name. The CLI always generates the canonical core key and no longer supports a `--core-state-key` override or fallback.

Migration: existing workspaces whose core state lives under a legacy key (`<prefix>.core.<env>.tfstate` or `<prefix>/<domain>/core.tfstate`) require a one-time migration before running `add environment` again:

1. Move that blob to `core.tfstate` in the same `terraform-state` container. Because the storage account is already scoped by prefix and environment, this is a blob rename with no Terraform state rewrite.
2. Update the `key` in `infra/core/<env>/backend.tf` to `core.tfstate`. The core module is not regenerated when the environment is already initialized, so this file must be updated explicitly.
3. Update the `core_state.key` in `infra/bootstrapper/<env>/main.tf` to `core.tfstate`, or run `dx add environment` after moving the blob to regenerate the bootstrapper configuration with the canonical key.
4. Run `terraform init -reconfigure` in both `infra/core/<env>` and `infra/bootstrapper/<env>` before the next Terraform operation.

The CLI does not discover or preserve legacy keys. A workspace with an unmigrated core state will generate configuration that points to `core.tfstate` and fail when Terraform tries to read the missing state.
