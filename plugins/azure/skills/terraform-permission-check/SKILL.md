---
name: terraform-permission-check
description: Check whether a DX repository's Terraform CD (apply) pipeline identity has the Azure RBAC permissions required to apply a change, before merge. Use when reviewing or opening a Terraform PR, when asked "will the pipeline have permission to apply this", when adding a resource, role assignment, resource group, subscription scope, shared resource, or cross-subscription access, or when an apply failed with AuthorizationFailed / 403. Identify missing action/scope pairs and give the DX-compliant remediation layer and module, never a generic broad-role grant. Read-only: never mutates Azure.
---

# Terraform CD Permission Check

This skill predicts, **before apply**, whether the **Infra CD (apply) identity**
of a DX-bootstrapped repository is missing an Azure RBAC permission the planned
Terraform change needs. The goal is to catch the slow failure mode where
`terraform plan` passes at PR time (read-only CI identity) but `terraform apply`
fails on merge with `AuthorizationFailed` because the CD identity lacks a
specific ARM action at a specific scope.

It is **read-only**: it never changes Azure or the repository. It only reports
gaps and their DX-compliant remediation.

## DX IaC layer model

Use this ownership order when choosing a remediation: **core → bootstrapper →
resources**. A later layer can consume earlier-layer outputs, but it must not
repair access owned by an earlier layer.

| Layer          | Owns                                                                                                    | Permission remediation owned here              |
| -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `core`         | Foundational shared infrastructure, including the Terraform state storage account                       | Access to the Terraform state account          |
| `bootstrapper` | Repository GitHub environments, UAMIs, baseline RBAC, subscription and team-owned resource-group access | Subscription- and resource-group-scoped access |
| `resources`    | Product/domain resources                                                                                | Narrow access to a specific resource           |

## DX IAM remediation policy

Classify every permission gap by its target scope before suggesting a fix.

### Role-assignment implementation rule

For every Terraform-managed role assignment in `core`, `bootstrapper`,
`resources`, or a target subscription, first inspect the installed
`pagopa-dx/azure-role-assignments/azurerm` version and its inputs. Use the DX
module when it supports the exact target resource scope. If it does not, use a
narrow `azurerm_role_assignment` at that scope and tell the user to report the
unsupported resource scope to the DX team. Do not block the required least-
privilege assignment while waiting for the module to add support.

### Subscription or team-owned resource-group scope

Put the remediation in the **bootstrapper** layer. Do not suggest manually
granting `Contributor`, `User Access Administrator`, `Owner`, or another broad
role to the Infra CD identity.

For a new team-owned resource group:

1. Create the resource group in bootstrap Terraform.
2. Pass its ID to `azure_github_environment_bootstrap` using
   `additional_resource_group_ids`.
3. Apply bootstrap before the resources configuration that uses the group.

The bootstrap module assigns the standard DX roles to repository identities at
the resource-group scope. This is also the required path for missing
subscription-level permissions: update the bootstrapper role model rather than
adding an ad hoc grant in `resources`.

For an additional assignment at subscription or resource-group scope, apply the
role-assignment implementation rule in bootstrapper.

### Terraform state storage account

The storage account holding Terraform state belongs to **core**. Put a missing
state-account permission in the core configuration that creates the account,
not in bootstrapper or resources.

The one exception is a permission gap that prevents the **core** configuration
from accessing its own state account. This is a bootstrap dependency: state it as
a manual precondition to be provisioned before re-running core. The manual
assignment may target only an Entra ID security group or a UAMI, never an
individual user.

For a Terraform-managed state-account role assignment, apply the role-assignment
implementation rule in core.

### Specific or shared resource scope

Put the remediation in the **resources** configuration next to the resource
that owns the scope. Use the narrowest resource-level role compatible with the
required action. For a shared resource, make the change in the repository that
owns that resource, not in the consumer repository.

Apply the role-assignment implementation rule in resources.

Each role assignment needs an exhaustive `description` that states the access
purpose, principal, target resource and scope, required access level, consuming
workload or pipeline, and relevant ticket or request reference.

Assign roles only to an Entra ID security group or UAMI. Never recommend an IAM
role assignment directly to an individual user.

### DX custom roles

Prefer the role abstractions in
[DX `azure-role-assignments` module](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments/azurerm/latest);
they add [DX custom roles](https://dx.pagopa.it/docs/azure/iam/custom-roles) where required, such as Storage Blob Tags Contributor
for blob writers and Storage Queue Data Message Contributor for queue consumers.
For supported bootstrap integration scenarios, configure the corresponding
bootstrap input (for example a shared APIM resource ID) rather than recreating
its role grants.

Do not invent a custom role. When built-in and existing DX roles do not fit,
report the missing action and narrow scope, then ask the DX team or governance
owners to evaluate a new custom role.

### Cross-subscription access

The configuration in the **target subscription**, which owns the target
resource, owns the role assignment. Apply the role-assignment implementation
rule there with the source UAMI or Entra ID group principal ID, target
subscription ID, resource-specific input, and an exhaustive description. Keep
the relationship documented in both owning teams.

If resolving a source identity through a Terraform data source, call out that
the reader also needs `Reader` access to the source resource. Follow the DX
cross-subscription procedure:
https://dx.pagopa.it/docs/azure/iam/iam-cross-subscription

### Networking

Do not recommend a networking IAM change for ordinary repository networking
work: standard networking permissions are managed by bootstrap. If the plan
shows a networking permission gap, report it as a DX support escalation with the
missing action and scope; do not propose a manual role grant.

## When to use this skill

- Reviewing or preparing a PR that changes Terraform infrastructure.
- The change adds an `azurerm_role_assignment`, a new resource type, or targets a
  new scope (resource group / subscription).
- An apply failed — or you suspect it will — with `AuthorizationFailed`, `403`,
  or "does not have authorization to perform action ... over scope".
- Someone asks "does the pipeline have the permissions to apply this?".

## What it checks

The Infra CD identity is the user-assigned managed identity used by the CD
(apply) workflow. Its effective permission set is **not fixed**: it depends on
the `azure_github_environment_bootstrap` module version the repo uses and on
per-repo customizations. The full discovery + check procedure lives in
[references/cd-permission-baseline-discovery.md](./references/cd-permission-baseline-discovery.md);
follow it exactly. This file orchestrates it.

## Prerequisites

- The target repository's Terraform is available locally (to identify the CD
  identity and, if needed, the fallback baseline).
- For the authoritative CI live check: the workflow's OIDC identity must have
  read access to the target CD UAMI, role assignments, and role definitions.
  The action collects these facts through the Azure SDK; see the live-check
  policy in the procedure.

## Workflow

### Step 1 — Get the change set

Obtain what the PR changes, preferring the **resolved plan** over raw code:

1. **Sanitized plan text (preferred)** — the `filtered_plan.txt` produced by the
   `sanitize-terraform-plan` action (resource-change headers + redacted attribute
   diffs). It is the resolved intent (for_each/modules/computed expanded) and has
   secrets already redacted.
2. **`.tf` code diff (fallback)** — the diff of `*.tf` against the base branch,
   when no plan output is available.

From the change set, list the **target resources/scopes** and the **ARM actions**
they require (create/update/replace/destroy; and especially any
`roleAssignments/write`).

### Step 2 — Identify the CD identity

Resolve the Infra CD identity by naming convention from the repo's Terraform, per
Step 1 of the procedure.

### Step 3 — Live check (read-only Azure SDK) — preferred

Follow Step 2 of the procedure:

- Use the deployed assignments and definitions collected by the action's
  read-only Azure SDK adapter to evaluate the CD identity at target scopes.
- If the SDK facts are **unavailable** or incomplete → tell the user, then go to
  Step 4. Do not attempt a mutation or suggest broadening the CI identity's
  permissions.

### Step 4 — Fallback: local Terraform-derived check

Only when the live check cannot run. Follow Step 3 of the procedure
(module version → assignments/scopes → definitions/`source_roles` →
customizations → combine). This is best-effort: it cannot see drift and reasons
at the role level, so flag uncertain conclusions.

### Step 5 — Report

Produce a concise verdict (see format below). Always state which path was used
(live Azure SDK vs. Terraform-derived fallback) so the reader knows how
authoritative the result is.

## Output format

```
## Terraform CD Permission Check

Identity: <cd-identity-name>
Checked via: <Azure RBAC | fallback (Terraform)>

Result: <✅ no gaps found | ⚠️ N potential gap(s)>

### Gaps
- Missing: <ARM action> at <scope>
  Required by: <resource address from the change set>
  Remediation layer: <core | bootstrapper | resources | target subscription | DX support>
  DX-compliant fix: <specific ownership action, required DX module input, and
  apply ordering; never a generic direct role grant>

### Notes
- <uncertainty / drift caveats, or "none">
```

If there are no gaps, keep the Gaps section empty and say so explicitly.

When the remediation belongs to an earlier layer, report it as a prerequisite and
do not claim that the current resources-layer plan becomes applyable until that
prerequisite has been applied.
