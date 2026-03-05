---
name: terraform-dx-best-practices-mcp
description: Usa solo strumenti MCP/registry per trovare moduli Terraform DX e generare output.
---

# Terraform DX Best Practices (MCP)

Questa skill genera codice Terraform DX-compliant usando **esclusivamente tool MCP** per la documentazione DX e i moduli del Terraform Registry.

## Tool MCP da usare (procedura obbligatoria)

### 1. DX Documentation (server `dx`)

Usa lo strumento `pagopa_query_documentation` (server MCP `dx`, URL: `https://api.dx.pagopa.it/mcp`) per queste query:

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

**NON usare**: DX Search API HTTP, documentazione locale allegata, `fetch_webpage`, conoscenza interna non supportata da un tool MCP.

## Regole di generazione obbligatorie

Seguire la skill base `terraform-dx-best-practices` per tutti i dettagli.

## Checklist di autovalutazione (6 check)

- [ ] `validate`: codice sintatticamente valido
- [ ] `naming`: `provider::dx::resource_name()` su tutti i nomi risorse
- [ ] `tags`: CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam
- [ ] `secrets`: nessun valore hardcoded, KV references
- [ ] `networking`: `dx_available_subnet_cidr` per subnet dedicate
- [ ] `modules`: moduli `pagopa-dx/*` con `version` pinned `~>`

## Output atteso

```
main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf, README.md
```

Il README deve elencare i tool MCP usati e le versioni modulo recuperate.
