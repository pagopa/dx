---
name: terraform-dx-best-practices-inline
description: Applies DX best practices using only internal knowledge, without consulting external APIs, documentation, or MCP tools.
---

# Terraform DX Best Practices (Inline)

This skill generates DX-compliant Terraform code using **exclusively the agent's internal knowledge**, without consulting external APIs, documentation, MCP tools, or subagents.

## Knowledge Source

- Use internal knowledge of PagoPA DX and its Terraform conventions.
- Do NOT make HTTP requests, do NOT use MCP tools, do NOT delegate to subagents.
- If a detail is uncertain (e.g., module version), state it explicitly in the README with `<!-- inline-assumption: ... -->`.

## Mandatory Generation Rules

Follow the base skill `terraform-dx-best-practices`. Additionally:

### Naming

- Configure the `pagopa-dx/azure` provider with alias `dx` in the `required_providers` block.
- ALWAYS use `provider::dx::resource_name()` for all Azure resource names.
- Syntax: `provider::dx::resource_name(environment, "resource-type")` where `resource-type` is the internal suffix (e.g., `"fn"` for Function App, `"st"` for Storage Account).

### Required Tags

Every resource MUST include these tags:

```hcl
tags = merge(var.tags, {
  CostCenter     = var.tags.CostCenter
  CreatedBy      = "Terraform"
  Environment    = var.environment.env_short
  BusinessUnit   = var.tags.BusinessUnit
  ManagementTeam = var.tags.ManagementTeam
})
```

### DX Registry Modules

- Before writing any `resource` block, ask yourself whether a `pagopa-dx/*` module exists in the Terraform Registry that wraps that resource.
- The `pagopa-dx` namespace contains modules for many resource types beyond compute and storage: role assignments, service bus, event hub, CDN, API management, container apps, etc.
- If your internal knowledge confirms a module exists for the resource, use it.
- If unsure whether a module exists, note it in the README with `<!-- inline-assumption: no DX module found for <resource> -->`.
- Pin the version with `~> major.minor` (e.g., `~> 1.0`).
- Use raw `azurerm_*` / `aws_*` resources **only if reasonably certain** no DX module covers that resource.

### Secrets

- NO hardcoded values for passwords, connection strings, or keys.
- Use `azurerm_key_vault_secret` or `@Microsoft.KeyVault(...)` references in app settings.

### No Placeholder Comments

**Always write complete, working code.** Never leave comments that instruct where to add something the agent could implement directly. Examples of what to avoid:

```hcl
# Add your app settings here
# TODO: configure Cosmos DB endpoint
# Add Key Vault reference for secrets
```

If information needed to generate the code is missing, ask the user before writing anything — do not emit skeleton code with inline instructions as a substitute.

### File Structure

Always generate separate files: `main.tf`, `variables.tf`, `outputs.tf`, `locals.tf`, `providers.tf`, `versions.tf`.

### Validate Generated Code

After generating all files, **always run validation** in the target directory before presenting the code to the user:

1. Run `terraform init` to initialize providers and modules. If backend configuration is unavailable, run `terraform init -backend=false`.
2. Run `terraform validate` — fix **all** errors before proceeding.
3. Run `terraform plan` if a backend and credentials are available; investigate and fix any errors reported.
4. **Iterate** until `validate` (and `plan` when applicable) pass with no errors.

Never present code to the user if `terraform validate` fails.

## Self-assessment Checklist (7 checks)

Before returning the code, verify:

- [ ] `validate`: `terraform init` and `terraform validate` completed without errors; `terraform plan` verified if backend is available
- [ ] `naming`: `provider::dx::resource_name()` used on ALL resource names
- [ ] `tags`: all 5 required tags present (CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam)
- [ ] `secrets`: no hardcoded values, use KV references
- [ ] `networking`: subnets use `dx_available_subnet_cidr` if dedicated subnets are required
- [ ] `modules`: at least one `pagopa-dx/*` module with `version` pinned `~>`
- [ ] `no_placeholders`: no placeholder comments — all code is fully implemented, no `# TODO`, `# add here`, or inline stubs

## Expected Output

Files to produce in the output folder:

```
main.tf        # main resources
variables.tf   # input variables
outputs.tf     # module outputs
locals.tf      # locally computed values
providers.tf   # provider configuration (pagopa-dx/azure, azurerm)
versions.tf    # required_providers and versions
README.md      # skill notes and assumptions made
```
