---
name: terraform-permission-check
description: Check whether a repository's Terraform CD (apply) pipeline identity has the Azure RBAC permissions required to apply a change, before merge. Use when reviewing or opening a PR with Terraform infrastructure changes, when asked "will the pipeline have permission to apply this", when adding azurerm_role_assignment or new resource types/scopes, or when a Terraform apply failed (or might fail) with AuthorizationFailed / 403 / does not have authorization to perform action. Surfaces missing (action, scope) and the role to grant. Read-only: never mutates Azure.
---

# Terraform CD Permission Check

This skill predicts, **before apply**, whether the **Infra CD (apply) identity**
of a DX-bootstrapped repository is missing an Azure RBAC permission the planned
Terraform change needs. The goal is to catch the slow failure mode where
`terraform plan` passes at PR time (read-only CI identity) but `terraform apply`
fails on merge with `AuthorizationFailed` because the CD identity lacks a
specific ARM action at a specific scope.

It is **read-only**: it never changes Azure or the repository. It only reports
gaps and the role/scope to grant.

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
  Step 4. Do not attempt a mutation or broaden the CI identity's permissions.

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
Check path: <Azure RBAC | fallback (Terraform)>

Result: <✅ no gaps found | ⚠️ N potential gap(s)>

### Gaps
- Missing: <ARM action> at <scope>
  Required by: <resource address from the change set>
  Suggested fix: grant <role> at <scope>

### Notes
- <uncertainty / drift caveats, or "none">
```

If there are no gaps, keep the Gaps section empty and say so explicitly.

## Out of scope

The `bootstrap` workflow/environment is not supported: its roles are managed by
the `dx-cli` and not present in Terraform, so they cannot be discovered. Changes
guarded by the bootstrap environment are out of scope (see the procedure).
