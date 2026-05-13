---
name: generate-azure-infra-with-dx-policies
description: Author plain azurerm_* Terraform in a consumer repository so that it satisfies the PagoPA DX OPA policy bundle. Use when asked to create or modify Azure infrastructure (storage accounts, function apps, app services, key vaults, networking, …) outside the dx repository, when no pagopa-dx Terraform module is available or desired, or when an AI agent must verify that hand-written or generated Terraform conforms to DX governance rules. Runs a write → terraform plan → conftest → patch loop against the published dx-policies bundle until the plan is policy-clean.
---

# Generate Azure Terraform that satisfies the DX OPA policy bundle

This skill is the consumer-side companion to the DX policy bundle. The
bundle encodes the rules that the `pagopa-dx/*` Terraform modules enforce
implicitly — minimum TLS, private networking defaults, MSI-only data plane,
naming convention, the `use_case` configuration matrix, cross-resource
invariants. Use it when you cannot or do not want to depend on the modules
themselves and must instead author plain `azurerm_*` resources that pass
the same governance gate.

> **Why this exists** — DX modules are designed for humans inside DX-owned
> repositories. In a consumer repo where an AI agent is the author, plain
> HCL plus a policy gate is a more reliable contract than a private module
> API the agent has not been trained on. Read
> [opa-poc/FINDINGS.md](https://github.com/pagopa/dx/blob/main/opa-poc/FINDINGS.md)
> for the full rationale.

## When to Use This Skill

- Creating Azure resources in a repository outside `pagopa/dx` where the DX
  Terraform modules are not used.
- An AI agent has been asked to add a storage account, function app, app
  service, key vault, container app, or similar Azure resource and must
  match DX governance.
- A human-authored PR is failing the DX OPA gate in CI and the diff must
  be brought back into compliance.
- Validating that hand-written or vendor-supplied Terraform conforms to
  DX rules before opening a PR.

## When NOT to Use This Skill

- Inside the `pagopa/dx` repository itself, or in a DX-owned repository
  that already consumes `pagopa-dx/*` modules. There the
  `terraform-best-practices` skill applies — prefer the module.
- For non-Azure resources. The current bundle covers Azure only.
- For policy authoring or maintenance — that is the
  `extract-policies-from-module` skill in `pagopa/dx`.

## Prerequisites

- `terraform` >= 1.6 with `hashicorp/azurerm ~> 4.0` configured.
- `conftest` >= 0.50 on PATH (`brew install conftest` /
  `https://github.com/open-policy-agent/conftest/releases`).
- The DX policy bundle locally available. See
  [Step 1](#step-1-fetch-the-dx-policy-bundle).
- `opa` >= 0.60 is **not** required — `conftest` ships its own evaluator.

## The loop

```
        ┌───────────────────────────────────────────┐
        │  user intent (e.g. "function app + db")   │
        └───────────────────┬───────────────────────┘
                            ▼
            1. fetch dx-policies bundle
                            ▼
            2. read policy index → list of [tag] rules
                            ▼
            3. emit plain azurerm_* HCL  ◄────────┐
                            ▼                     │
            4. terraform init && plan -out=p.bin  │ patch
                            ▼                     │
            5. terraform show -json p.bin > plan  │
                            ▼                     │
            6. conftest test plan --policy …      │
                            ▼                     │
                  any deny? ──── yes ─────────────┘
                            │
                            no
                            ▼
                7. open PR with the plan + conftest output
```

Steps 3–6 repeat until conftest is silent. **Hard cap the loop at 5
iterations**; if it has not converged, stop and surface the remaining
`deny` messages to a human — there is likely a policy that no `azurerm_*`
shape can satisfy and a maintainer must update the bundle.

## Step 1: Fetch the DX policy bundle

The bundle is published as an OCI image and as a GitHub release artifact.
Prefer pinning to a tag, never `latest`:

```bash
# OCI (preferred in CI):
mkdir -p .dx-policies && cd .dx-policies
oras pull ghcr.io/pagopa/dx-policies:vX.Y.Z

# GitHub release (preferred locally):
gh release download vX.Y.Z --repo pagopa/dx --pattern 'dx-policies-*.tar.gz' --dir .dx-policies
tar -xzf .dx-policies/dx-policies-*.tar.gz -C .dx-policies
```

The unpacked tree contains:

```
.dx-policies/
├── policies/         # *.rego files, package main + main.lib.*
├── policy_index.md   # human/AI-readable list of [tag] rules
└── VERSION
```

If the bundle is not yet published in your environment, fall back to a
git checkout of `pagopa/dx` and point `--policy` at
[opa-poc/policies/](https://github.com/pagopa/dx/tree/main/opa-poc/policies).
This is acceptable for prototyping but not for CI.

## Step 2: Read the policy index before writing code

Open `.dx-policies/policy_index.md` and identify every rule whose tag prefix
matches the resources you intend to create:

| If the user asks for… | Read tags…                                             |
| --------------------- | ------------------------------------------------------ |
| Storage account       | `[storage:*]`, `[uc:*]`, `[xref:storage_pep]`          |
| Function app          | `[func:*]`, `[xref:func_storage]`, `[xref:func_diag]`  |
| Anything with secrets | `[kv:*]` (and apply the `azure-keyvault-secret` skill) |
| Any resource          | `[naming:*]` — always applies                          |

For matrix tags (`[uc:*]`, `[tier:*]`, …) the index documents the
**convention tag** the agent must emit — typically `tags.DX<VariableName>`
in PascalCase, e.g. `tags.DXUseCase = "audit"`. Setting it commits the
resource to a specific row of the matrix; the policies enforce the rest.

## Step 3: Author the HCL

Apply these defaults proactively — they are the most frequent denials:

```hcl
resource "azurerm_storage_account" "example" {
  name                = "..."     # see Step 4 — naming
  resource_group_name = "..."
  location            = "..."

  account_tier              = "Standard"
  account_replication_type  = "ZRS"            # or per DXUseCase
  account_kind              = "StorageV2"
  min_tls_version           = "TLS1_2"
  https_traffic_only_enabled = true
  allow_nested_items_to_be_public = false
  cross_tenant_replication_enabled = false
  shared_access_key_enabled = false
  default_to_oauth_authentication = true
  public_network_access_enabled = false
  infrastructure_encryption_enabled = true     # required for [uc:audit]

  identity {
    type = "SystemAssigned"
  }

  tags = {
    ModuleSource = "azurerm-direct"   # signals "not from pagopa-dx module"
    DXUseCase    = "default"          # commits to a matrix row
    # plus the standard PagoPA tags: BusinessUnit, ManagementTeam, CostCenter, …
  }
}
```

For **cross-resource** rules, emit the sibling resources in the same plan
— a storage account with `public_network_access_enabled = false` requires
an `azurerm_private_endpoint` whose `private_connection_resource_id`
references it; a function app requires an `azurerm_monitor_diagnostic_setting`
targeting it. The `[xref:*]` rules check substrings in resource names, so
keep names predictable.

## Step 4: Apply the naming convention

The bundle includes `policies/lib/naming.rego` ported from the custom
`dx` provider. The shape is:

```
<prefix>-<env>-<location>-<domain>-<app>-<abbreviation>-<instance>
```

with `prefix ∈ {dx, io, …}`, `env ∈ {d, u, p}`, `location ∈ {weu, itn, …}`,
abbreviation from the table in `policies/lib/naming.rego`, and a
zero-padded instance number. Storage-like resources (`storage_account`,
`container_registry`) drop the hyphens and lowercase the whole string:
`dxditnplatformst01`.

Read `policies/lib/naming.rego` directly — its `abbreviations` dict is the
authoritative list. Do not invent new abbreviations; if the resource type
is missing, stop and request the maintainer to add it to the bundle.

## Step 5: Run the validation loop

```bash
terraform init -backend=false
terraform plan -out=plan.bin -var-file=...    # never -auto-approve here
terraform show -json plan.bin > plan.json
conftest test plan.json \
    --policy .dx-policies/policies \
    --namespace main
```

Read every `FAIL` message; each starts with a `[<family>:<rule_id>]` tag
that maps directly to a rule in `policy_index.md`. Patch the HCL, regenerate
the plan, re-run `conftest`. **Never** silence a rule by editing the policy
files — those are the contract.

## Step 6: Open the PR

Include in the PR description:

- the `conftest` output (must be empty),
- the bundle version (`cat .dx-policies/VERSION`),
- the `DX*` matrix tags applied and why.

CI in the consumer repo should re-run the same `conftest` invocation against
the same bundle version as a final gate. If your repo does not yet have
that workflow, add it before merging — the local check is necessary but
not sufficient.

## Hard rules

- **Never run `terraform apply`** as part of this loop. The skill stops at
  `plan` + `conftest`.
- **Never edit the policy files** to make a deny go away. If a rule appears
  wrong, open an issue against `pagopa/dx`.
- **Never use `latest`** as the bundle version. Pin and bump deliberately.
- **Never store secrets in `terraform.tfvars`** that ends up in git. If the
  resource set involves Azure Key Vault, stop and apply the
  `azure-keyvault-secret` skill before continuing.
- **Stop after 5 failed loop iterations.** Surface the remaining denies
  to a human reviewer — looping forever wastes credits and signals a
  policy/azurerm gap that needs human attention.

## Troubleshooting

| Symptom                                           | Likely cause                                                             | Fix                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `[uc:unknown] DXUseCase value '…' not in matrix`  | Tag value is wrong or matrix was extended in a newer bundle version      | Read `policy_index.md`; pick a valid value or bump the bundle |
| `[xref:storage_pep]` fires on a public storage    | Policy requires PEP whenever `public_network_access_enabled = false`     | Either flip the flag (rare) or add `azurerm_private_endpoint` |
| `[naming:shape]` fires but the name looks correct | Storage-like type expected unhyphenated lowercase                        | Strip hyphens for `storage_account` / `container_registry`    |
| Loop never converges                              | Two rules in tension, or the resource cannot be modeled in plain azurerm | Stop, surface denies, escalate to DX maintainers              |
| `conftest` says `no policies found`               | `--policy` path wrong or bundle not unpacked                             | Re-run Step 1; check `.dx-policies/policies/*.rego` exists    |

## References

- Bundle source and rationale: <https://github.com/pagopa/dx/tree/main/opa-poc>
- Companion skill (DX side, policy authoring): `extract-policies-from-module`
  in `pagopa/dx` `.github/skills/`.
- Sibling skills:
  - `azure-keyvault-secret` — for any resource set with secrets.
  - `terraform-best-practices` — use **inside** `pagopa/dx` instead of this skill.
