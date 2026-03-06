---
name: terraform-dx-best-practices-rag
description: Recupera best practice DX interrogando la DX Search API (https://api.dx.pagopa.it/search) e integra i risultati nella generazione.
---

# Terraform DX Best Practices (RAG)

## Agent Instructions

When generating Terraform code, follow these instructions:

### 1. Search DX Documentation for Best Practices

**Always query the DX Search API** before generating code. Make direct POST requests:

```bash
# 1. Folder structure and code style
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Terraform folder structure code style", "number_of_results": 5}'

# 2. Naming and DX provider
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Azure naming convention provider::dx::resource_name", "number_of_results": 5}'

# 3. Required tags
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Terraform required tags CostCenter BusinessUnit ManagementTeam", "number_of_results": 5}'

# 4. Module usage documentation (module discovery is done via Module-first rule below, not RAG)
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "DX Terraform modules pagopa-dx usage examples", "number_of_results": 5}'

# 5. Secrets and Key Vault
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Key Vault references AppSettings secrets Terraform", "number_of_results": 5}'

# 6. Networking and subnets
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "dx_available_subnet_cidr networking subnet delegation Terraform", "number_of_results": 5}'
```

The API returns a JSON object with:

- `query`: The search query
- `results`: Array of result objects containing `content`, `score`, and `source` URL

Integrate the results and cite sources in the final README.

**Do NOT use**: local files, `fetch_webpage`, or internal knowledge for best practices — the Module-first rule in step 2 is the only exception (always uses the Registry API or MCP).

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

**Before asking the user, check for values in the existing infrastructure:**

1. **Look for existing `.tf` files** in `infra/resources/<env>/` matching the target environment (`dev`, `prod`, `uat`). Read `locals.tf` or similar files to extract: `prefix`, `env_short`, `location`, `domain`, `instance_number`, resource group names, subscription ID references, and existing `tags` values (BusinessUnit, ManagementTeam, CostCenter).

2. **Check for the core-values-exporter module**: If any `.tf` file in the infra already references a `pagopa-dx/<csp>-core-values-exporter/azurerm` module (e.g., `pagopa-dx/azure-core-values-exporter/azurerm`), its outputs expose shared infrastructure values — VNet ID, VNet resource group, PEP subnet ID, and more. Reference them via `module.<name>.<output>` instead of declaring new `data` sources. Invite the user to review the full output list on the Terraform Registry:
   ```
   https://registry.terraform.io/modules/pagopa-dx/<csp>-core-values-exporter/azurerm/latest
   ```

**Only ask the user for values that could not be inferred from the steps above:**

- **Module use_case**: present all available `use_case` options with their descriptions (see section 4 below)
- `environment` values not already found: prefix, env_short, location, domain, app_name, instance_number
- `tags` values not already found: BusinessUnit, ManagementTeam
- Backend state configuration

### 4. Ask One Question at a Time

**Never bundle multiple values into a single question.** Ask each unknown value in a separate, focused question. This reduces errors and makes it easier for the user to answer accurately.

**Wrong ❌**
> Please provide prefix, domain, app_name, and instance_number separated by commas.

**Right ✅**
> What is the `prefix` for this project? (e.g., `io`, `pagopa`, `dx`)

> What is the `domain`? (e.g., `wallet`, `payments`, `skl`)

> What is the `app_name`? (e.g., `storager`, `processor`)

> What `instance_number` should be used? (e.g., `01`, `02`)

**Offer choices whenever the set of valid values is known:**

- `env_short`: `p` (prod) / `d` (dev) / `u` (uat)
- `location`: `italynorth` / `westeurope` / `spaincentral`
- `BusinessUnit`: App IO / CGN / Carta della Cultura / IT Wallet / DevEx / Other (specify)
- `ManagementTeam`: IO Platform / IO Wallet / IO Comunicazione / IO Enti & Servizi / IO Autenticazione / IO Bonus & Pagamenti / IO Firma / Developer Experience / Other (specify)

Use free-form only for values with no fixed set (`prefix`, `domain`, `app_name`). Infer them from existing code if available before asking.

**For technical options such as module `use_case`**, always present a descriptive table so the user can make an informed choice. Fetch the available options from the module's documentation and format them like this example (Cosmos DB module):

| use_case | Description | Zone Redundancy |
|---|---|---|
| `development` | Recommended for development or testing environments where cost efficiency and flexibility are key. Do not use in production. | Enabled |
| `default` | Suitable for production environments requiring predictable performance and provisioned throughput. | Disabled |

Then ask: *"Which `use_case` best fits your needs?"*

### 5. Never Assume Default Values

If project-specific configuration is not found in the workspace, ask the user.

### 6. Never Leave Placeholder Comments

**Always write complete, working code.** Never leave comments that instruct where to add something the agent could implement directly. Examples of what to avoid:

```hcl
# Add your app settings here
# TODO: configure Cosmos DB endpoint
# Add Key Vault reference for secrets
```

If information needed to generate the code is missing, ask the user before writing anything — do not emit skeleton code with inline instructions as a substitute.

### 7. Validate and Fix Generated Code

After generating all files, **always run validation** in the target directory before presenting the code to the user:

1. Run `terraform init` to initialize providers and modules. If backend configuration is unavailable, run `terraform init -backend=false`.
2. Run `terraform validate` — fix **all** errors before proceeding.
3. Run `terraform plan` if a backend and credentials are available; investigate and fix any errors reported.
4. **Iterate** until `validate` (and `plan` when applicable) pass with no errors.

Never present code to the user if `terraform validate` fails.

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

### Code Quality

- [ ] No placeholder comments — all configuration is fully implemented, no `# TODO`, `# add here`, or `# configure below` stubs

### Before Committing

- [ ] `terraform init` (or `terraform init -backend=false`) completed successfully
- [ ] `terraform validate` passes with no errors
- [ ] `terraform plan` reviewed (if backend and credentials are available)
- [ ] Run `pre-commit run -a` on staged files

---

## Additional Resources

For detailed documentation, search the DX knowledge base or visit:

- [DX Documentation](https://dx.pagopa.it/docs/)
- [Terraform Best Practices](https://dx.pagopa.it/docs/terraform/)
- [Azure Naming Conventions](https://dx.pagopa.it/docs/azure/azure-naming-convention)
- [DX Terraform Modules](https://registry.terraform.io/namespaces/pagopa-dx)
