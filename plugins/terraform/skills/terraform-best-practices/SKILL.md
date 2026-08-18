---
name: terraform-best-practices
description: Generate Terraform changes that follow PagoPA DX conventions. Use when creating or modifying Terraform resources, modules, or infrastructure architecture in this repository, especially to prefer pagopa-dx modules, infer values from existing infrastructure, validate generated code, handle secrets safely, and check the DX Technology Radar.
---

# Terraform Best Practices Skill

Use this skill to produce complete, validated Terraform changes that follow PagoPA DX conventions and prefer reusable `pagopa-dx/*` modules over raw provider resources.

## When to Use This Skill

- Creating or modifying Terraform in `infra/`, `infra/modules/`, or repository infrastructure folders.
- Adding cloud resources, IAM/RBAC, networking, monitoring, secrets, or module calls.
- Designing Terraform architecture and choosing between inline resources, local modules, and DX registry modules.
- Reviewing Terraform for DX conventions, required tags, naming, subnet allocation, module versions, validation, and Technology Radar alignment.

## Setup

1. Use the local DX knowledge base from `DX_KB_PATH` if set, otherwise `~/.dx`. If the current repository is `pagopa/dx`, use the current checkout as the knowledge base.
2. If the knowledge base is missing, continue only for read-only advice. Before generating Terraform, tell the user to clone `pagopa/dx` or set `DX_KB_PATH` so module source and documentation can be inspected.
3. Use the `technology-radar` skill when available. If it is not available, fetch `https://dx.pagopa.it/radar.json` directly. If neither works, ask the user to confirm any technology that is not already established in the target codebase.
4. Use `azure-keyvault-secret` before creating `azurerm_key_vault_secret` resources. If it is unavailable, do not generate secret resources that would require values in Terraform state; ask the user to install/enable the skill or confirm secrets are managed outside Terraform.
5. Use `azure-keyvault-reference` when app settings, environment variables, or Container App secrets reference Key Vault. If unavailable, still enforce the baseline rules in this skill: no secret literals, versionless references by default, and least-privilege secret-reader access for runtime identities.

Local KB paths to inspect, relative to the selected knowledge-base root (`DX_KB_PATH` or the current `pagopa/dx` checkout):

- `apps/website/docs/terraform/` - DX Terraform best practices, folder structure, code style, module usage, validation, and deployment docs.
- `apps/website/docs/azure/` - Azure-specific DX guidance.
- `infra/modules/` - source code for DX Terraform modules.
- `infra/modules/<module>/README.md` and `examples/` - module usage documentation and examples.

## Guardrails

Apply the [Terraform Guardrails](./references/guardrails.md) to every change. Use [Source Routing](./references/source-routing.md) to load only the authoritative documentation and module source needed for the request.

## Workflow

1. **Discover** the target area and matching DX modules using [Staged Module Discovery](./references/module-discovery.md).
2. **Decide** by separating repository facts, convention-owned choices, and material trade-offs.
3. **Summarize** the current state, planned change, applicable guardrails, and unresolved decisions before editing.
4. **Implement and validate** using [Implementation Workflow](./references/implementation-workflow.md).
5. **Review** every applicable guardrail ID and report any exception with a concrete next step.

## Decision Ownership

Follow the [Decision Policy](./references/question-policy.md):

- infer factual values only from explicit repository evidence
- preserve the base `environment` contract and map it to `provider::dx::resource_name()`
- apply convention-owned details without asking
- ask about one material trade-off at a time
- derive choices from module source and explain their effects
- never silently select `use_case`; ask unless the user supplied it or explicitly requested mirroring a named instance
- do not question the user about unrelated low-impact optional variables

## References

- [Module Discovery](./references/module-discovery.md)
- [Implementation Workflow](./references/implementation-workflow.md)
- [Decision Policy](./references/question-policy.md)
- [Terraform Guardrails](./references/guardrails.md)
- [Source Routing](./references/source-routing.md)
- [Terraform Troubleshooting](./references/troubleshooting.md)
