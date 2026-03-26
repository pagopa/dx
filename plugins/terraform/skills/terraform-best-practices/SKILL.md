---
name: terraform-best-practices
description: Generate Terraform code following PagoPA DX best practices. Reads DX documentation, enforces module-first usage from the pagopa-dx Registry namespace, discovers module capabilities dynamically, collects required values from the existing workspace, and validates all generated code before presenting it to the user.
---

# Terraform DX Best Practices (Local)

## Agent Instructions

When generating Terraform code, follow these instructions:

> **⚡ Parallelism**: Steps 2 (read DX docs), 3 (search modules), and 12 (fetch Technology Radar) are fully independent. **Launch them in parallel using subagents** whenever possible — do not wait for one to finish before starting the next. Merge all results before proceeding to code generation.

### 1. Clone the DX Repository locally

Clone `https://github.com/pagopa/dx` into the current working directory
or pull it to ensure the documentation is up to date:

```bash
if [ ! -d ".dx" ]; then
  git clone --depth 1 https://github.com/pagopa/dx ".dx"
else
  git -C ".dx" pull --ff-only
fi
```

### 2. Read Local DX Documentation Files

**Always read the DX Terraform documentation** before generating code.
All markdown sources within `.dx/apps/website/docs/terraform/` are the authoritative source for DX best practices.

### 3. Search Terraform DX Modules Before Writing Any Resource

**CRITICAL — Module-first rule**: before writing **any** Terraform `resource` block, you MUST check whether a `pagopa-dx/*` module already wraps that resource type. This applies to every resource: compute, storage, networking, IAM/RBAC role assignments, monitoring, and more.

#### Procedure

1. **List all available DX modules** — do this once at the start:
   - Scan the `.dx/infra/modules/` directory — each subdirectory is a DX module. List them to build the catalogue.
2. **If a matching module exists**:
   - Read the module's `README.md` and `examples/` to understand its capabilities and usage patterns (see step 4 below).
   - Get the module's latest published version via `https://registry.terraform.io/v1/modules/pagopa-dx/<module>/<provider>` and pin it with `~> major.minor`. Use `package.json` if available as a fallback to check the latest version.
   - **Use the module instead of raw resources.**
3. **Only use raw `azurerm_*` / `aws_*` resources** if no DX module covers that resource type.

#### Common modules you may overlook

The `pagopa-dx` namespace contains modules for many resource types beyond compute and storage. Examples of frequently missed modules include role assignments, service bus, event hub, CDN, API management, and container apps. **Always search — do not assume a module doesn't exist.**

#### Special case: sensitive values and secrets

Whenever the implementation involves managing sensitive values, secrets, or anything stored in Azure Key Vault, **stop and invoke the `azure-keyvault-secret` skill** before writing any code. It covers the correct and secure patterns for handling secrets in Terraform, including how to avoid storing sensitive data in state.

### 4. Discover Module Capabilities from Source, Not Just Summaries

For each relevant DX module, inspect the underlying source in `.dx/infra/modules/` so you understand what the module can really do, not just its published usage snippet.

Read these files when available:

- `README.md`
- `variables.tf`
- `outputs.tf`
- `main.tf` and other supporting `.tf` files
- `examples/`
- `CHANGELOG.md`

Use the module source to build a **capability map**:

- Top-level optional variables with defaults become candidate capabilities.
- Nested objects and lists become sub-capabilities.
- `validation` blocks define constraints the user must respect.
- Examples and implementation files show how a capability changes behavior in practice.

Do **not** rely on a hardcoded list of features for a module. Discover them dynamically from `variables.tf` and the module source.

### 5. Ask User for Required Values

**Before asking the user, check for values in the existing infrastructure:**

1. **Determine the target folder** from `infra-folder-structure.md` (read in step 2) based on the user's request — for example, ongoing environment resources go in `infra/resources/<env>/`, bootstrapping goes in `infra/bootstrapper/<env>/`. Then look for existing `.tf` files in that folder to extract: `prefix`, `env_short`, `location`, `domain`, `instance_number`, resource group names, subscription ID references, and existing `tags` values (BusinessUnit, ManagementTeam, CostCenter). Ask the user only if the documentation does not clarify which folder to use.

2. **Check for the core-values-exporter module**: If any `.tf` file in the infra already references a `pagopa-dx/<csp>-core-values-exporter/<azurerm|aws>` module (e.g., `pagopa-dx/azure-core-values-exporter/azurerm`), its outputs expose shared infrastructure values — VNet ID, VNet resource group, PEP subnet ID, and more. Reference them via `module.<name>.<output>` instead of declaring new `data` sources.

**Only ask the user for values that could not be inferred from the steps above:**

- **Module use_case**: present all available `use_case` options with their descriptions (see step 5 below)
- `environment` values not already found: prefix, env_short, location, domain, app_name, instance_number
- `tags` values not already found: BusinessUnit, ManagementTeam
- Backend state configuration

### 6. Ask One Question at a Time

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

#### Dynamic capability questions

Derive further user questions from the module capability map built from `variables.tf` (see step 4).

For each optional capability:

1. Explain **what it does** in plain language.
2. Explain the **default behavior** if the user leaves it unconfigured.
3. Explain **what changes** if the user enables it, disables it, or chooses a different value (behavior, security, scale, resilience, cost, operations).
4. Ask whether the user needs it.
5. If enabled, ask follow-up questions for sub-fields.

Examples of the kinds of capabilities this should catch dynamically include public vs private exposure, custom domains, Entra ID auth, Key Vault secret references, autoscaling, sizing, diagnostic settings, retention, private endpoints, or replica creation.

When the set of valid answers is known, offer choices instead of free-form input.

### 7. Never Assume Default Values

If project-specific configuration is not found in the workspace, ask the user.

### 8. Summarize Current and Planned State

Before writing or editing Terraform, briefly present to the user:

1. **Current state**: a concise summary of the existing infrastructure relevant to the request.
2. **Planned changes**: what will be added, modified, or removed, and why.

Keep it focused on the affected resources and their direct dependencies — a full infrastructure inventory is not needed.
This summary ensures the user understands the impact before code is generated.

### 9. Write Complete, Commented Terraform — No Skeletons, No Placeholders

**Always write complete, working code.** Never leave comments that merely instruct the user what to add later.

#### Comment rule for user-choosable parameters

For **every user-choosable parameter** in the generated IaC, add an inline comment, just above it, that explains:

1. **What the parameter controls**
2. **What changes if the value changes**

This rule applies to all non-defaulted parameters that the user can choose, including but not limited to:

- top-level module inputs
- nested object fields
- configurable list items
- booleans, sizing, scaling, networking, diagnostics, retention, authentication, and similar design choices

Skip comments for purely mechanical wiring such as obvious IDs, names derived from the standard pattern, or direct output-to-input connections with no design choice involved.

### 10. Auto-wire Implicit Capabilities

Some capabilities should not be left to chance once the user has chosen a higher-level feature. Wire them automatically when needed:

- **Role assignments** when an identity needs data-plane or secret access
- **Managed identity** when services must read Key Vault or other protected resources
- **Private endpoints / private DNS wiring** when a private service pattern is selected
- **Write-only secret resources** for Key Vault-managed secrets
- **Required tags** according to DX conventions
- **Explicit dependencies** where Terraform ordering would otherwise be ambiguous

If a capability is automatically added, explain it briefly to the user so the generated topology stays understandable.

### 11. Validate and Fix Generated Code

After generating all files, **always run validation** in the target directory before presenting the code to the user:

1. Run `terraform init` to initialize providers and modules. If backend configuration is unavailable, run `terraform init -backend=false`.
2. Run `terraform validate` — fix **all** errors before proceeding.
3. Run `terraform plan` if a backend and credentials are available; investigate and fix any errors reported.
4. **Iterate** until `validate` (and `plan` when applicable) pass with no errors.

Never present code to the user if `terraform validate` fails.

> For common errors and fixes, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### 12. Align with the Technology Radar

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
