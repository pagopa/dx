---
name: terraform-dx-best-practices-subagent
description: Delegates Terraform best practice research to a DX subagent, then integrates the result.
---

# Terraform DX Best Practices (Subagent)

This skill generates DX-compliant Terraform code by delegating **documentation research** to a specialised subagent, then integrating the findings into the generation.

## Delegation Procedure (mandatory)

**Step 1 — Launch research subagent**

Delegate to the subagent the task of collecting:

1. DX code style and folder structure (from `https://api.dx.pagopa.it/search` or `fetch_webpage`)
2. Naming convention (`provider::dx::resource_name`) and provider `pagopa-dx/azure`
3. List of required tags (CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam)
4. **Full list of ALL available modules** in the `pagopa-dx` namespace on the Terraform Registry. The subagent must:
   - Call `search_modules(moduleQuery="pagopa-dx")` (if MCP available) or `GET https://registry.terraform.io/v1/modules/search?namespace=pagopa-dx&limit=50`
   - Return the full list with module name and description
   - For each module relevant to the user's task, retrieve inputs and version with `get_module_details` / `get_latest_module_version`
5. Latest versions of the modules found in step 4
6. Secrets management with Key Vault references
7. Networking patterns (`dx_available_subnet_cidr`)

The subagent may use any available tool (HTTP curl, MCP tools, `fetch_webpage`).
Instruct the subagent to return a structured report with the collected information.

**Step 2 — Integrate the results**

Use the information returned by the subagent to generate the Terraform code. Do NOT invent details not found by the subagent; if any are missing, document them in the README with `<!-- subagent-gap: ... -->`.

**Module-first rule**: before writing any `resource` block, check the module list returned by the subagent for a `pagopa-dx/*` module covering that resource type. The namespace covers many resource types: role assignments, service bus, event hub, CDN, API management, container apps, etc. **Use the module if it exists.** Use raw resources only as a fallback.

**Step 3 — Generate the code**

Follow the base skill `terraform-dx-best-practices` for naming, tags, modules, secrets, and file structure.

## Validate Generated Code

After generating all files, **always run validation** in the target directory before presenting the code to the user:

1. Run `terraform init` to initialize providers and modules. If backend configuration is unavailable, run `terraform init -backend=false`.
2. Run `terraform validate` — fix **all** errors before proceeding.
3. Run `terraform plan` if a backend and credentials are available; investigate and fix any errors reported.
4. **Iterate** until `validate` (and `plan` when applicable) pass with no errors.

Never present code to the user if `terraform validate` fails.

## Self-assessment Checklist (7 checks)

- [ ] `validate`: `terraform init` and `terraform validate` completed without errors; `terraform plan` verified if backend is available
- [ ] `naming`: `provider::dx::resource_name()` used on ALL resource names
- [ ] `tags`: CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam
- [ ] `secrets`: no hardcoded values, KV references used
- [ ] `networking`: `dx_available_subnet_cidr` for dedicated subnets
- [ ] `modules`: `pagopa-dx/*` modules with `version` pinned `~>`
- [ ] `no_placeholders`: no placeholder comments — all code is fully implemented, no `# TODO`, `# add here`, or inline stubs

## Expected Output

```
main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf, README.md
```

The README must include a "Delegation Process" paragraph explaining what the subagent searched for and what it found.
