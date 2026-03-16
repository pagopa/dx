---
name: terraform-best-practices
description: Generate Terraform code following PagoPA DX best practices. Reads DX documentation, enforces module-first usage from the pagopa-dx Registry namespace, collects required values from the existing workspace, and validates all generated code before presenting it to the user.
---

# Terraform DX Best Practices (Local)

## Agent Instructions

When generating Terraform code, follow these instructions:

> **⚡ Parallelism**: Steps 1 (read DX docs), 2 (search Registry modules), and 8 (fetch Technology Radar) are fully independent. **Launch them in parallel using subagents** whenever possible — do not wait for one to finish before starting the next. Merge all results before proceeding to code generation.

### 1. Read Local DX Documentation Files

**Always read the DX documentation files** before generating code. These files are the authoritative source for DX best practices.

**If the DX repository is available locally** (the workspace contains `apps/website/docs/`), read the files below via `read_file` before generating any code:

```
apps/website/docs/terraform/index.md
apps/website/docs/terraform/code-style.md
apps/website/docs/terraform/infra-folder-structure.md
apps/website/docs/terraform/pre-commit-terraform.md
apps/website/docs/terraform/using-terraform-registry-modules.md
apps/website/docs/azure/using-azure-registry-provider.md
```

**If the DX repository is NOT present locally**, use one of the following fallbacks (in order of preference):

1. **Clone to a persistent local directory**: keep the repo in `~/.dx` so it can be reused across sessions. Always clone or pull to ensure the documentation is up to date. Run in a terminal:
   ```bash
   if [ ! -d "$HOME/.dx" ]; then
     git clone --depth 1 https://github.com/pagopa/dx "$HOME/.dx"
   else
     git -C "$HOME/.dx" pull --ff-only
   fi
   ```
   Then read the files from `~/.dx/apps/website/docs/terraform/`.
2. **GitHub file tools**: if GitHub file-reading tools are available, fetch each file from the `pagopa/dx` repository at path `apps/website/docs/terraform/<filename>`.
3. **Raw GitHub URL**: use `fetch_webpage` on:
   ```
   https://raw.githubusercontent.com/pagopa/dx/main/apps/website/docs/terraform/<filename>
   ```

If a file does not exist (locally or remotely), note it in the README with `<!-- local-missing: <filename> -->` and continue without it.

Other retrieval methods (DX Search API, MCP documentation tools, internal knowledge) may return useful context, but are not the preferred source. Treat them as supplementary only — always verify against the authoritative files above when available.

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

#### Special case: sensitive values and secrets

Whenever the implementation involves managing sensitive values, secrets, or anything stored in Azure Key Vault, **stop and invoke the `azure-keyvault-secret` skill** before writing any code. It covers the correct and secure patterns for handling secrets in Terraform, including how to avoid storing sensitive data in state.

### 3. Ask User for Required Values

**Before asking the user, check for values in the existing infrastructure:**

1. **Determine the target folder** from `infra-folder-structure.md` (read in step 1) based on the user's request — for example, ongoing environment resources go in `infra/resources/<env>/`, bootstrapping goes in `infra/bootstrapper/<env>/`. Then look for existing `.tf` files in that folder to extract: `prefix`, `env_short`, `location`, `domain`, `instance_number`, resource group names, subscription ID references, and existing `tags` values (BusinessUnit, ManagementTeam, CostCenter). Ask the user only if the documentation does not clarify which folder to use.

2. **Check for the core-values-exporter module**: If any `.tf` file in the infra already references a `pagopa-dx/<csp>-core-values-exporter/<azurerm|aws>` module (e.g., `pagopa-dx/azure-core-values-exporter/azurerm`), its outputs expose shared infrastructure values — VNet ID, VNet resource group, PEP subnet ID, and more. Reference them via `module.<name>.<output>` instead of declaring new `data` sources. Invite the user to review the full output list on the Terraform Registry:
   ```
   https://registry.terraform.io/modules/pagopa-dx/<csp>-core-values-exporter/<azurerm|aws>/latest
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

| use_case      | Description                                                                                                                  | Zone Redundancy |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `development` | Recommended for development or testing environments where cost efficiency and flexibility are key. Do not use in production. | Enabled         |
| `default`     | Suitable for production environments requiring predictable performance and provisioned throughput.                           | Disabled        |

Then ask: _"Which `use_case` best fits your needs?"_

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

> For common errors and fixes, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### 8. Align with the Technology Radar

Before choosing any Azure/AWS service or technology, verify its **adoption status** in the PagoPA DX Technology Radar:

```
GET https://dx.pagopa.it/radar.json
```

Each entry has a `ring` field:

| Ring     | Meaning                           | Action                                                            |
| -------- | --------------------------------- | ----------------------------------------------------------------- |
| `adopt`  | Stable, widely used in production | **Prefer these** — use as default choice                          |
| `trial`  | Validated in limited scenarios    | Use with awareness — note it in a README comment                  |
| `assess` | Promising but not yet validated   | Avoid unless explicitly requested by the user                     |
| `hold`   | Deprecated or discouraged         | **Do not use** — warn the user and suggest an `adopt` alternative |

**Relevant services for Terraform code** (non-exhaustive — always check the live radar):

- ✅ `adopt`: Azure App Service, Azure Function App, Azure Cosmos DB, Azure Storage Account, Azure Key Vault, Azure API Management, Azure Application Insights, Azure Managed Identity, Azure Cache for Redis, Azure Database for PostgreSQL Flexible, AWS Lambda, AWS S3, AWS DynamoDB, AWS SQS, AWS ECS Fargate
- 🔬 `trial`: Azure Container Apps
- 👀 `assess`: Azure Service Bus
- 🚫 `hold`: Azure Database for MySQL Flexible Server

If the user requests a service flagged as `hold`, issue an explicit warning:

> ⚠️ **[Service name]** is marked as **hold** in the PagoPA DX Technology Radar. It is discouraged for new projects. Consider using **[adopt alternative]** instead.

If the user explicitly confirms they want to proceed, generate the code but add a comment on the resource block:

```hcl
# radar: hold — consider migrating to <alternative>
```

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

- [ ] Target directory derived from DX documentation (`infra-folder-structure.md`) based on what the user is trying to do — only ask the user if the documentation does not clarify it
- [ ] Local modules (if any) are in an `_modules/` folder relative to the target infra directory

### Configuration

- [ ] `environment` variable follows standard structure
- [ ] All resources include required tags

### Security

- [ ] Secrets use Key Vault references (`@Microsoft.KeyVault(...)`)
- [ ] No sensitive values hardcoded in Terraform code
- [ ] For any sensitive value or secret managed through Azure Key Vault, the **`azure-keyvault-secret` skill** has been followed

### Technology Radar

- [ ] All services and technologies used are `adopt` or `trial` in the [PagoPA DX Technology Radar](https://dx.pagopa.it/radar.json) — `hold` items have a `# radar: hold` comment and user acknowledgement

### Code Quality

- [ ] No placeholder comments — all configuration is fully implemented, no `# TODO`, `# add here`, or `# configure below` stubs

### Before finishing

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
