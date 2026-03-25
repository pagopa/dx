# Module Discovery Guide

How the agent finds and inspects PagoPA DX Terraform modules at runtime.
This is NOT a static catalog — the agent discovers modules dynamically using
the tools below.

## Discovery Tools

### Terraform Registry MCP (primary)

Use the Terraform MCP server tools to search and inspect modules:

```
1. search_modules(module_query: "pagopa-dx")
   → Returns list of all published DX modules with IDs

2. get_module_details(module_id: "<publisher>/<name>/<provider>/<version>")
   → Returns full documentation: inputs, outputs, dependencies, usage examples
```

This gives the **public contract** of each module — what the developer needs to know.

### GitHub MCP (source code)

For deeper inspection, read module source from `pagopa/dx` using GitHub MCP tools:

```
get_file_contents(owner: "pagopa", repo: "dx", path: "infra/modules/<dir_name>/<file>")
```

| What to read | Path | Why |
|---|---|---|
| README.md | `infra/modules/<dir>/README.md` | Features, use cases, setup guides, code examples |
| variables.tf | `infra/modules/<dir>/variables.tf` | **All capabilities** — each variable = a configurable feature. Validation blocks reveal constraints. |
| outputs.tf | `infra/modules/<dir>/outputs.tf` | What the module exposes downstream |
| examples/ | `infra/modules/<dir>/examples/` | Real configurations to use as starting templates |
| CHANGELOG.md | `infra/modules/<dir>/CHANGELOG.md` | Latest version, breaking changes |

### DX Documentation Site

For architectural patterns and best practices, fetch pages from `dx.pagopa.it`:

- [Infrastructure folder structure](https://dx.pagopa.it/docs/terraform/infra-folder-structure)
- [Using Terraform Registry modules](https://dx.pagopa.it/docs/terraform/using-terraform-registry-modules)
- [Azure IAM](https://dx.pagopa.it/docs/azure/iam/azure-iam)
- [Azure networking](https://dx.pagopa.it/docs/azure/networking/)
- [Required tags](https://dx.pagopa.it/docs/terraform/required-tags)

## Directory Name → Registry Mapping

Module directories in `pagopa/dx` use underscores; registry names use hyphens.
The mapping pattern is:

```
infra/modules/azure_container_app/  →  pagopa-dx/azure-container-app/azurerm
infra/modules/azure_postgres_server/  →  pagopa-dx/azure-postgres-server/azurerm
infra/modules/azure_role_assignments/  →  pagopa-dx/azure-role-assignments/azurerm
```

**Rule**: replace `_` with `-`, publisher is always `pagopa-dx`, provider matches the
cloud (usually `azurerm`, or `aws` for AWS modules).

Not all directories are published modules — some are internal only (e.g.,
`azure_naming_convention` is used by other modules but not standalone).
The `search_modules` call confirms what's actually on the registry.

## Capability Extraction Pattern

After reading a module's `variables.tf`, extract capabilities by analyzing:

1. **Top-level optional variables** with defaults → each is a toggleable capability
2. **Nested object variables** → sub-capabilities with their own options
3. **Validation blocks** → constraints and allowed values
4. **Variable descriptions** → explain the "why" to the developer

### Example: Extracting Capabilities from `azure_container_app`

Reading `variables.tf` yields variable groups. Map each to a capability:

| Variable | Type | Default | Capability |
|---|---|---|---|
| `public_access_enabled` | `bool` | `true` | **Network exposure**: public vs private |
| `custom_domain` | `object` | `null` | **Custom domain**: hostname + DNS/cert |
| `authentication` | `object` | `null` | **User authentication**: Entra ID EasyAuth |
| `secrets` | `list(object)` | `[]` | **Key Vault integration**: secret references |
| `autoscaler` | `object` | `null` | **Autoscaling**: replicas, HTTP/queue/custom KEDA scalers |
| `size` | `object` | `null` | **Sizing**: CPU/memory allocation (validation: memory = cpu×2) |
| `diagnostic_settings` | `object` | `{enabled=false}` | **Monitoring**: Log Analytics integration |
| `container_app_templates[].liveness_probe` | `object` | required | **Health probes**: liveness, readiness, startup |
| `revision_mode` | `string` | `"Multiple"` | **Deployment strategy**: single vs multiple revisions |

Each row becomes a question in Step 3 (if not already answered by context).

### What to highlight to the developer

For each capability, provide:
- **What it does** (from the variable description)
- **When to use it** (from README features section)
- **Constraints** (from validation blocks — e.g., "memory must equal cpu×2")
- **Default behavior** (what happens if they don't configure it)
- **Example** (from the examples/ directory)

## Reference Compositions

These existing compositions in `pagopa/dx` show how modules are combined:

| Composition | Path in pagopa/dx | Modules used |
|---|---|---|
| Web app + DB + auth | `infra/resources/_modules/metrics_portal/` | container_app + postgres_server + role_assignments |
| Static website | `infra/resources/_modules/dx_website/` | Storage (static web app) + DNS |
| Test infrastructure | `infra/resources/_modules/testing/` | VNets, subnets, DNS zones, Log Analytics |

Fetch these with GitHub MCP when the user's use case matches — they're the best
starting templates for real-world compositions.
