# CD Permission Check & Baseline Discovery

This document is the **procedure** for determining whether the **Infra CD
(apply) identity** of a repository that uses the DX GitHub bootstrap has the
Azure RBAC permissions required by a Terraform change. It is consumed by the
`terraform-permission-check` skill (local) and by the CI action.

> The CD permission set is **not a fixed list**. It depends on the version of the
> `azure_github_environment_bootstrap` module the repository uses **and** on
> per-repository customizations. Always determine it; never assume a previously
> seen set of roles is current.

## What "baseline" means

The baseline is the set of **(ARM action, scope)** pairs the Infra CD identity is
allowed to perform. A Terraform change is "applyable" only if every action its
resources require is covered at the relevant scope.

The baseline is produced by **two distinct Terraform sources**:

| Source                                        | Provides                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `azure_github_environment_bootstrap`          | The role **assignments** to the CD identity: which role at which scope.                   |
| `azure_core_infra` → `custom_roles` submodule | The role **definitions**: the actual ARM actions inside each `DX Infra CD *` custom role. |

To get a usable baseline you need **both**: the assignments tell you the scopes,
the definitions tell you the actions.

## Inputs you need

- The target repository's Terraform (to detect module version + customizations).
- The environment under analysis (`dev` / `uat` / `prod`).
- For live checks: the **official Azure MCP server**, running **read-only** (see
  the live-check policy below).

## Live-check policy (read-only, Azure MCP only)

A live permission check has **exactly one supported mechanism**: the **official
Azure MCP server**, running in **read-only mode**. This is deliberate — a
developer's own credential typically carries write permissions, so the safe
surface must be enforced by the mechanism, not by trusting the caller's RBAC.

Rules:

- The Azure MCP server **MUST** be started with read-only enabled
  (`azureMcp.readOnly`). Concretely, add the `--read-only` argument to the Azure
  MCP server's `args` in your MCP configuration (e.g. `.vscode/mcp.json` or your
  MCP client config) and restart the server.
- **If read-only is not enabled: STOP.** Do not run any live check. Tell the
  user to enable read-only mode and exactly how (above), then re-run.
- **Do not use any other live mechanism** — no `az`, no Azure Resource Graph /
  `az graph`, no direct ARM/REST calls. The read-only Azure MCP server is the
  only permitted live path.
- **If the Azure MCP server is not available**, or it returns no usable answer:
  **tell the user**, then fall back to the local Terraform-derived check
  (Step 3).

## Step 1 — Identify the CD identity (naming convention)

The Infra CD identity is a **user-assigned managed identity**. Do not hard-code
its object id; resolve it by name.

- Managed identity name pattern (via the `dx` provider `resource_name`):

  ```
  {prefix}-{env_short}-{location}-{domain}-infra-github-cd-id-{instance}
  ```

  Example: `io-p-itn-ipatente-infra-github-cd-id-01`.

- The matching GitHub environment is `infra-{env}-cd` where `env` maps
  `d→dev`, `u→uat`, `p→prod`.

Resolve the values from the repository's Terraform (`environment` block:
`prefix`, `env_short`, `location`, `domain`, `instance_number`). When the
read-only Azure MCP server is available (Step 2), use it to resolve the
identity's `principalId`.

## Step 2 — Live check (Azure MCP, read-only) — preferred

This is the authoritative path: it reflects the **deployed** truth and catches
drift. It requires the read-only Azure MCP server per the live-check policy.

1. **Precondition.** Confirm the Azure MCP server is available and in read-only
   mode. If it is available but **not** read-only → **STOP** and instruct the
   user to enable read-only (`--read-only`). If it is **not available** → tell
   the user and go to Step 3.
2. **Derive the targets.** From the change set, list the target resources/scopes
   and the ARM actions they require (creating, updating, replacing, destroying
   resources; and especially any role assignments — `roleAssignments/write`).
3. **Query.** Ask the Azure MCP server whether the CD identity (Step 1) holds
   the required roles/actions at those scopes.
4. **Conclude.** Report any (action, scope) the identity is missing, with the
   suggested role/scope to grant. If the server returns no usable answer for
   some targets → tell the user and complete those with Step 3.

## Step 3 — Fallback: local Terraform-derived check

Use this only when the live check cannot run (Azure MCP unavailable or
inconclusive). It reconstructs the baseline from the repository's Terraform, so
it is best-effort: it **cannot see drift** and **cannot fully expand built-in
roles to actions** without Azure. Reason at the **role / source-role** level.

### 3a — Determine the bootstrap module version

Find which version of `azure_github_environment_bootstrap` the repo uses, in this
order of preference:

1. **Lock / init metadata** — `.terraform/modules/modules.json` or
   `.terraform.lock.hcl` in the relevant Terraform root (most accurate: the
   resolved version).
2. **Module block** — the `source` + `version` of the
   `azure_github_environment_bootstrap` module call in the repo's `.tf`.
3. **Registry fallback** — if neither is available, resolve the latest version
   matching the declared constraint from the Terraform registry.

### 3b — Role assignments (scopes)

Do not assume a fixed list of roles — they change across module versions. Read
the actual assignments from the module's `id_infra_cd_iam.tf` at the detected
version: every `azurerm_role_assignment` whose `principal_id` is the Infra CD
identity yields a **(role, scope)** pair. Map each `scope` expression back to the
repo's inputs to get the concrete scope, typically:

- the **subscription**,
- each resource group in `resource_group_ids` (main RG **+** every entry of
  `additional_resource_group_ids`),
- the **private DNS zone** resource group (`private_dns_zone_resource_group_id`),
- the **Terraform state** Storage Account (`terraform_storage_account`).

> Watch for scope asymmetry: a role that allows managing role assignments
> (`Microsoft.Authorization/roleAssignments/write`) may be granted at some
> scopes but not others. Creating an `azurerm_role_assignment` at a scope that
> lacks it will fail at apply even though plan succeeds — so always check the
> specific scope of the change, not just whether the permission exists somewhere.

### 3c — Role definitions (actions)

Each `DX Infra CD *` role is a **merged custom role** built by
`azure_core_infra`'s `custom_roles` submodule (via `pagopa-dx/azure-merge-roles`),
combining several built-in roles plus extra actions. Read the `source_roles`
declared for each `DX Infra CD *` role in
`azure_core_infra/modules/custom_roles/custom_roles.tf` at the detected module
version, and reason about whether those built-in roles cover the required
actions. (Full expansion of built-in roles to concrete actions needs Azure and
is therefore out of reach in this offline fallback — keep the reasoning at the
role level and flag uncertainty.)

### 3d — Local customizations

Beyond the standard assignments, a repo may grant the CD identity extra
permissions. Check for:

- **`additional_resource_group_ids`** input — extends the
  `DX Infra CD Resource Groups` assignment to more RGs.
- **Repo-level `azurerm_role_assignment`** resources whose `principal_id`
  targets the Infra CD identity (or its `principalId`), granting extra roles at
  extra scopes.
- **Bootstrap module outputs** used elsewhere to grant custom roles (e.g. the
  CD identity's `principal_id` output wired into another role assignment).

Add every discovered (role, scope) to the baseline.

### 3e — Combine

Merge 3b–3d into a single list of **(role/action, scope)** entries and compare it
against the actions the change set requires. Report gaps with the suggested
role/scope to grant, and flag any conclusions that are uncertain because the
built-in roles could not be expanded.

## Out of scope (postponed)

The **`bootstrap` workflow/environment** is intentionally **not supported** by
this procedure. Its identity and roles are provisioned by the `dx-cli`, not
imported into Terraform, so they cannot be discovered from the repo or the
module. Changes guarded by the bootstrap environment are out of scope until that
gap is addressed.
