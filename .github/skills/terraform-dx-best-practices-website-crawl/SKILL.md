---
name: terraform-dx-best-practices-website-crawl
description: Recupera tutto solo tramite fetch_webpage sulle pagine https://dx.pagopa.it/docs/terraform/. Vietato usare altre fonti o memoria. Se fetch_webpage non è disponibile, rispondi che non puoi completare il task.
---

# Terraform DX Best Practices (Website Crawl)

## Agent Instructions

When generating Terraform code, follow these instructions:

### 1. Fetch DX Documentation from Official Website

**Always fetch** the official DX documentation via `fetch_webpage` before generating code. If `fetch_webpage` is not available, state that the task cannot be completed.

Fetch these pages:

```
https://dx.pagopa.it/docs/terraform/
https://dx.pagopa.it/docs/terraform/infra-folder-structure
https://dx.pagopa.it/docs/terraform/code-style
https://dx.pagopa.it/docs/terraform/required-tags
https://dx.pagopa.it/docs/terraform/pre-commit-terraform
https://dx.pagopa.it/docs/terraform/using-terraform-registry-modules
https://dx.pagopa.it/docs/azure/azure-naming-convention
https://dx.pagopa.it/docs/azure/using-azure-registry-provider
https://dx.pagopa.it/docs/azure/networking/
https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings
```

For each page, extract: code examples, rules, configurations. Cite the visited URLs in the final README.

**Do NOT use**: DX Search API, local files, or internal knowledge for best practices — the Module-first rule in step 2 is the only exception (always uses the Registry API or MCP).

### 2. Search DX Modules Before Writing Any Resource

**CRITICAL — Module-first rule**: before writing **any** `resource` block, you MUST check whether a `pagopa-dx/*` module already wraps that resource type. This applies to every resource: compute, storage, networking, IAM/RBAC role assignments, monitoring, and more.

#### Procedure

1. **List all available DX modules** — do this once at the start:
   - **If Terraform MCP tools are available** (preferred): call `search_modules` with query `pagopa-dx` to get the full catalogue.
   - **Otherwise**, query the Terraform Registry API:
     ```
     GET https://registry.terraform.io/v1/modules?namespace=pagopa-dx&limit=100
     ```
     The response has an array `modules[]` with fields `name`, `provider`, `version`. Use `version` as the latest available.
2. **For each resource you plan to create**, scan the module list for a match (e.g., if you need `azurerm_role_assignment` → look for a module named `azure-role-assignments`; if you need `azurerm_cosmosdb_account` → look for `azure-cosmos-account`).
3. **If a matching module exists**:
   - Call `get_module_details` (MCP) or fetch `https://registry.terraform.io/modules/pagopa-dx/<module>/azurerm/latest` to read its inputs, outputs, and usage examples.
   - Call `get_latest_module_version` to pin the version with `~> major.minor`.
   - **Use the module instead of raw resources.**
4. **Only use raw `azurerm_*` / `aws_*` resources** if no DX module covers that resource type.

#### Common modules you may overlook

The `pagopa-dx` namespace contains modules for many resource types beyond compute and storage. Examples of frequently missed modules include role assignments, service bus, event hub, CDN, API management, and container apps. **Always search — do not assume a module doesn't exist.**

### 3. Ask User for Required Values

**Ask the user for project-specific values** when not found in the existing codebase:

- **Module use_case**: Present all available `use_case` options from the chosen modules' documentation and **always ask the user to select the appropriate one** (e.g., "default", "high_load", "spot")
- `environment` values: prefix, env_short, location, domain, app_name, instance_number
- `tags` values: BusinessUnit, ManagementTeam
- Backend state configuration

### 4. Prefer Multiple-Choice Questions

When asking the user, offer choices when possible:

- `env_short`: "p (prod)", "d (dev)", "u (uat)"
- `location`: "italynorth", "westeurope", "spaincentral"
- `BusinessUnit`: "App IO", "CGN", "Carta della Cultura", "IT Wallet", "DevEx", or "Other (specify)"
- `ManagementTeam`: "IO Platform", "IO Wallet", "IO Comunicazione", "IO Enti & Servizi", "IO Autenticazione", "IO Bonus & Pagamenti", "IO Firma", "Developer Experience", or "Other (specify)"

Use free-form only for truly unknown values like `prefix`, `domain`, `app_name`. Prefix and domain may be inferred from existing code if available.

### 5. Never Assume Default Values

If project-specific configuration is not found in the workspace, ask the user.

---

## DX Code Review Checklist

### DX Modules & Providers

- [ ] **Always use DX Registry modules (`pagopa-dx/*`)** — only use raw resources if the specific use case is not supported
- [ ] DX provider configured for resource naming (`pagopa-dx/azure` or `pagopa-dx/aws`)
- [ ] `provider::dx::resource_name()` used for all resource names
- [ ] Module versions specified using `~>` operator with major and minor versions only (e.g., `~> 1.5`)
  - Ensures compatibility while allowing patch updates
  - See [Semantic Versioning](https://dx.pagopa.it/docs/azure/using-azure-registry-provider#semantic-versioning) for details

### Project Structure

- [ ] Code is in `infra/resources/<env>/` folder structure
- [ ] Local modules (if any) are in `infra/resources/_modules/`

### Configuration

- [ ] `environment` variable follows standard structure
- [ ] All resources include required tags

### Security

- [ ] Secrets use Key Vault references (`@Microsoft.KeyVault(...)`)
- [ ] No sensitive values hardcoded in Terraform code

### Before Committing

- [ ] Run `pre-commit run -a` on staged files

---

## Additional Resources

For detailed documentation, search the DX knowledge base or visit:

- [DX Documentation](https://dx.pagopa.it/docs/)
- [Terraform Best Practices](https://dx.pagopa.it/docs/terraform/)
- [Azure Naming Conventions](https://dx.pagopa.it/docs/azure/azure-naming-convention)
- [DX Terraform Modules](https://registry.terraform.io/namespaces/pagopa-dx)
