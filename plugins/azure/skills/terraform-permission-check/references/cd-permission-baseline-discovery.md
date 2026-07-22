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
- For CI live checks: the CI OIDC identity, configured with read access to the
  CD UAMI, role assignments, and role definitions.

## DX remediation ownership

Use the policy in `SKILL.md` when reporting a gap. The relevant ownership model
is `core` → `bootstrapper` → `resources`:

- **Subscription or team-owned resource-group access** belongs in bootstrapper.
  Create a new team-owned group in bootstrap Terraform and pass its ID through
  `additional_resource_group_ids` to `azure_github_environment_bootstrap`.
- **Terraform state storage access** belongs in core, which owns the state
  account. If core cannot access its own state, report an external manual
  bootstrap prerequisite for an Entra ID security group or UAMI, never an
  individual user.
- **Specific resource access** belongs next to the target resource in resources,
  using `pagopa-dx/azure-role-assignments/azurerm` when the installed module
  supports the exact scope, otherwise a narrow `azurerm_role_assignment` and a
  report to the DX team about the unsupported scope.
- **Cross-subscription access** belongs in the target subscription's owning
  configuration. Apply the same module-or-plain-resource rule there and follow
  the [DX cross-subscription procedure](https://dx.pagopa.it/docs/azure/iam/iam-cross-subscription).
- **Networking gaps** are a DX support escalation because bootstrap manages the
  standard networking permissions.

Do not recommend broad direct grants to the Infra CD identity, invented custom
roles, or assignments to individual users. Use the DX role-assignment module
where its installed version supports the exact scope; otherwise use a narrow
plain resource and report the support gap to the DX team. The custom-role list
for human reference is the [DX custom-roles page](https://dx.pagopa.it/docs/azure/iam/custom-roles).

## Live-check policy (read-only Azure SDK)

A CI live permission check uses the action's Azure SDK adapter under the
workflow OIDC identity. The target CD identity is resolved through
`ManagedServiceIdentityClient`, then role assignments and role definitions are
read through `AuthorizationManagementClient`.

Rules:

- The CI identity must have least-privilege management-plane reads for
  `Microsoft.ManagedIdentity/userAssignedIdentities/read`,
  `Microsoft.Authorization/roleAssignments/read`, and
  `Microsoft.Authorization/roleDefinitions/read` in the target subscription.
- The SDK adapter must perform reads only. It must not invoke `az`, Azure
  Resource Graph, or any mutating ARM operation.
- **If SDK facts are unavailable**, or a target scope cannot be evaluated,
  report the limitation and fall back to the Terraform-derived check (Step 3).
- The live check does not currently collect management-group inherited role
  assignments or deny assignments. Mark these cases as uncertain in the report.

## Step 1 — Identify the CD identity (naming convention)

The Infra CD identity is a **user-assigned managed identity**. Do not hard-code
its object id; resolve it by name.

- Managed identity name pattern (via the `dx` provider `resource_name`):

  ```text
  {prefix}-{env_short}-{location}-{domain}-infra-github-cd-id-{instance}
  ```

  Example: `io-p-itn-ipatente-infra-github-cd-id-01`.

- The matching GitHub environment is `infra-{env}-cd` where `env` maps
  `d→dev`, `u→uat`, `p→prod`.

Resolve the values from the repository's Terraform (`environment` block:
`prefix`, `env_short`, `location`, `domain`, `instance_number`). When the
CI action has the identity name and resource group, use the Azure SDK to resolve
its `principalId`. The standard DX identity naming convention supports a
resource-group fallback, but callers should pass the resource group when the
identity does not follow it.

## Step 2 — Live check (Azure SDK, read-only) — preferred

This is the preferred path: it reflects deployed role assignments and catches
drift that Terraform cannot see.

1. **Precondition.** Confirm the CI OIDC identity has the required read access.
   If it does not, report the unavailable SDK context and go to Step 3.
2. **Derive the targets.** From the change set, list the target resources/scopes
   and the ARM actions they require (creating, updating, replacing, destroying
   resources; and especially any role assignments — `roleAssignments/write`).
3. **Query.** Use the CD identity's deployed role assignments and role
   definitions collected by the Azure SDK adapter at the target scopes.
4. **Conclude.** Report any (action, scope) the identity is missing, with the
   remediation layer, apply ordering, and DX module input required by the
   remediation ownership policy. If the SDK context is unavailable for some
   targets → tell the user and complete those with Step 3.

## Step 3 — Fallback: local Terraform-derived check

Use this only when the live check cannot run (Azure SDK facts unavailable or
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
- **Existing repo-level role assignments** whose `principal_id` targets the
  Infra CD identity (or its `principalId`), granting extra roles at extra scopes.
  Include them in the baseline but do not use a raw `azurerm_role_assignment` as
  the remediation pattern for a new gap.
- **Bootstrap module outputs** used elsewhere to grant custom roles (e.g. the
  CD identity's `principal_id` output wired into another role assignment).

Add every discovered (role, scope) to the baseline.

### 3e — Combine

Merge 3b–3d into a single list of **(role/action, scope)** entries and compare it
against the actions the change set requires. Report gaps with the owning layer
and DX-compliant remediation, and flag any conclusions that are uncertain because
the built-in roles could not be expanded.

## Out of scope (postponed)

The **`bootstrap` workflow/environment** is intentionally **not supported** by
this procedure. Its identity and roles are provisioned by the `dx-cli`, not
imported into Terraform, so they cannot be discovered from the repo or the
module. Changes guarded by the bootstrap environment are out of scope until that
gap is addressed.
