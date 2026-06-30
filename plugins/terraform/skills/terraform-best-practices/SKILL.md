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

Local KB paths to inspect:

- `apps/website/docs/terraform/` - DX Terraform best practices, folder structure, code style, module usage, validation, and deployment docs.
- `apps/website/docs/azure/` - Azure-specific DX guidance.
- `infra/modules/` - source code for DX Terraform modules.
- `infra/modules/<module>/README.md` and `examples/` - module usage documentation and examples.

## Core Rules

- Read the authoritative DX Terraform docs under `apps/website/docs/terraform/` before generating code.
- Check the Technology Radar before recommending new services or technologies. Prefer `adopt`, allow `trial` with explanation, avoid `assess` unless explicitly requested, and block `hold` unless the user confirms.
- Search for a matching `pagopa-dx/*` registry module before writing any raw `azurerm_*` or `aws_*` resource. See [Module Discovery](./references/module-discovery.md).
- Infer values from existing Terraform before asking the user. Ask one focused question at a time only for values or decisions that cannot be inferred.
- Use secure secret patterns: no secret values in Terraform code, variables, locals, outputs, `.tfvars`, app settings, or container environment variables.
- Use `provider::dx::resource_name()` for resource names and `dx_available_subnet_cidr` for every new subnet.
- Pin DX registry module versions with `~> major.minor`, using the module `package.json` as the source for the current version.
- Never create `variables.tf` in root environment folders. Root environment configuration belongs in `locals.tf`; local modules own their own `variables.tf`.

## Workflow

1. **Plan** by reading the relevant DX docs, inspecting the target Terraform area, checking the Technology Radar, and discovering matching DX modules. For each resource you intend to create, explicitly look for a matching DX module; for broad changes that span several services, consider parallelizing independent inspections of documentation, module source, existing infrastructure, and the radar.
2. **Summarize before editing**: briefly state the current relevant infrastructure and the planned changes, including any non-standard choices.
3. **Implement** using [Implementation Workflow](./references/implementation-workflow.md). Prefer existing patterns in the target folder and keep changes complete rather than skeletal.
4. **Validate** in the target Terraform directory:
   - Run `terraform init`; if backend configuration is unavailable, run `terraform init -backend=false`.
   - Run `terraform validate` and fix all errors.
   - Run `terraform plan` only when credentials and backend access are already available.
   - Run the smallest existing pre-commit or Nx validation that covers the changed Terraform files.
   - For common errors and fixes, see [Terraform Troubleshooting](./references/troubleshooting.md).
5. **Review** against the [Terraform Best Practices Checklist](./references/checklist.md), then report any unmet criteria with a concrete next step.

## Question Policy

Follow [Question Policy](./references/question-policy.md) whenever user input is needed. In short: infer first, ask only unresolved decisions, ask one question at a time, offer choices when valid values are known, and explain the default plus security/cost/operations impact for optional capabilities.

## Code Generation Policy

- Write complete, working Terraform. Do not leave placeholder comments such as `TODO`, `add here`, or `configure later`.
- Add comments only for non-obvious user-choosable parameters where changing the value affects cost, security, scale, resilience, or operations.
- Auto-wire implicit dependencies required by a chosen feature: role assignments, managed identities, private endpoints, private DNS, write-only secret resources, tags, and explicit `depends_on` where Terraform ordering is otherwise ambiguous.
- Reuse shared outputs from `pagopa-dx/<csp>-core-values-exporter/<provider>` modules instead of duplicating `data` sources when those outputs already exist.

## References

- [Module Discovery](./references/module-discovery.md)
- [Implementation Workflow](./references/implementation-workflow.md)
- [Question Policy](./references/question-policy.md)
- [Terraform Best Practices Checklist](./references/checklist.md)
- [Terraform Troubleshooting](./references/troubleshooting.md)
- [Eval Test Prompts](./references/eval-prompts.md)
- [Eval Rubric](./references/eval-rubric.md)
