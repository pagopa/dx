---
name: terraform-dx-best-practices-mcp
description: Uses only MCP/registry tools to find DX Terraform modules and generate output.
---

# Terraform DX Best Practices (MCP)

This skill generates DX-compliant Terraform code using **exclusively MCP tools** for DX documentation and Terraform Registry modules.

## MCP Tools to Use (mandatory procedure)

### 1. DX Documentation (server `dx`)

Use the `pagopa_query_documentation` tool (MCP server `dx`, URL: `https://api.dx.pagopa.it/mcp`) for these queries:

```
pagopa_query_documentation(query="Terraform folder structure code style")
pagopa_query_documentation(query="Azure naming convention provider::dx::resource_name")
pagopa_query_documentation(query="Terraform required tags CostCenter BusinessUnit ManagementTeam")
pagopa_query_documentation(query="DX Terraform modules pagopa-dx Function App Storage Cosmos")
pagopa_query_documentation(query="Key Vault references AppSettings secrets")
pagopa_query_documentation(query="dx_available_subnet_cidr networking subnet")
```

### 2. Terraform Registry — Module-first search (server `terraform-mcp-server`)

**CRITICAL — Before writing ANY `resource` block**, search whether a `pagopa-dx/*` module wraps that resource type.

**Step 1 — List all available modules** (do this once at the start):

```
search_modules(moduleQuery="pagopa-dx")
```

This returns the full catalogue of DX modules. Scan the results to build a mental map of which resource types are covered.

**Step 2 — For each resource you plan to create**, check if the catalogue contains a matching module. Examples:

- `azurerm_role_assignment` → look for `azure-role-assignments`
- `azurerm_cosmosdb_account` → look for `azure-cosmos-account`
- `azurerm_storage_account` → look for `azure-storage-account`
- `azurerm_eventhub_namespace` → look for `azure-event-hub`
- `azurerm_servicebus_namespace` → look for `azure-service-bus-namespace`

**Step 3 — If a matching module exists**, retrieve its details and latest version:

```
get_module_details(moduleID="pagopa-dx/<module>/azurerm/<version>")
get_latest_module_version(namespace="pagopa-dx", module="<module>", provider="azurerm")
```

Use the module instead of raw resources. Pin the version with `~> major.minor`.

**Step 4 — Only use raw `azurerm_*` / `aws_*` resources** if no DX module covers that resource type.

### 3. Provider DX

```
get_latest_provider_version(namespace="pagopa-dx", provider="azure")
get_provider_capabilities(namespace="pagopa-dx", name="azure")
```

**Do NOT use**: HTTP DX Search API, attached local documentation, `fetch_webpage`, or internal knowledge not backed by an MCP tool.

## Mandatory Generation Rules

Follow the base skill `terraform-dx-best-practices` for all details.

### No Placeholder Comments

**Always write complete, working code.** Never leave comments that instruct where to add something the agent could implement directly. Examples of what to avoid:

```hcl
# Add your app settings here
# TODO: configure Cosmos DB endpoint
# Add Key Vault reference for secrets
```

If information needed to generate the code is missing, ask the user before writing anything — do not emit skeleton code with inline instructions as a substitute.

## Validate Generated Code

After generating all files, **always run validation** in the target directory before presenting the code to the user:

1. Run `terraform init` to initialize providers and modules. If backend configuration is unavailable, run `terraform init -backend=false`.
2. Run `terraform validate` — fix **all** errors before proceeding.
3. Run `terraform plan` if a backend and credentials are available; investigate and fix any errors reported.
4. **Iterate** until `validate` (and `plan` when applicable) pass with no errors.

Never present code to the user if `terraform validate` fails.

## Align with the Technology Radar

Before choosing any Azure/AWS service or technology, check the [PagoPA DX Technology Radar](https://dx.pagopa.it/radar.json).

| Ring     | Action                                                            |
| -------- | ----------------------------------------------------------------- |
| `adopt`  | **Prefer these** — standard choice                                |
| `trial`  | Use with awareness — add a README note                            |
| `assess` | Avoid unless explicitly requested by the user                     |
| `hold`   | **Do not use** — warn the user and suggest an `adopt` alternative |

Key services (always check the live radar for updates):

- ✅ `adopt`: Azure App Service, Azure Function App, Azure Cosmos DB, Azure Storage Account, Azure Key Vault, Azure API Management, Azure Application Insights, Azure Managed Identity, Azure Cache for Redis, Azure Database for PostgreSQL Flexible, AWS Lambda, AWS S3, AWS DynamoDB, AWS SQS, AWS ECS Fargate
- 🔬 `trial`: Azure Container Apps
- 👀 `assess`: Azure Service Bus
- 🚫 `hold`: Azure Database for MySQL Flexible Server

If the user requests a `hold` service, warn them:

> ⚠️ **[Service name]** is marked as **hold** in the PagoPA DX Technology Radar. Consider **[adopt alternative]** instead.

If the user explicitly confirms they want to proceed, add a comment on the resource block:

```hcl
# radar: hold — consider migrating to <alternative>
```

## Self-assessment Checklist (8 checks)

- [ ] `validate`: `terraform init` and `terraform validate` completed without errors; `terraform plan` verified if backend is available
- [ ] `naming`: `provider::dx::resource_name()` used on ALL resource names
- [ ] `tags`: CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam
- [ ] `secrets`: no hardcoded values, KV references used
- [ ] `networking`: `dx_available_subnet_cidr` for dedicated subnets
- [ ] `modules`: `pagopa-dx/*` modules with `version` pinned `~>`
- [ ] `no_placeholders`: no placeholder comments — all code is fully implemented, no `# TODO`, `# add here`, or inline stubs
- [ ] `radar`: all services are `adopt` or `trial` in the [Technology Radar](https://dx.pagopa.it/radar.json); `hold` services have user acknowledgement and a `# radar: hold` comment

## Output atteso

```
main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf, README.md
```

Il README deve elencare i tool MCP usati e le versioni modulo recuperate.
