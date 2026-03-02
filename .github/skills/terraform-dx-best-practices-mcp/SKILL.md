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

### 2. Terraform Registry (server `terraform-mcp-server`)

Usa gli strumenti del server `terraform-mcp-server` per i moduli DX:

```
search_modules(moduleQuery="pagopa-dx azure-function-app")
search_modules(moduleQuery="pagopa-dx azure-storage-account")
search_modules(moduleQuery="pagopa-dx azure-cosmos-account")
get_latest_module_version(namespace="pagopa-dx", module="azure-function-app", provider="azurerm")
```

Per ogni modulo trovato, recupera inputs, outputs e usage examples:
```
get_module_details(moduleID="pagopa-dx/azure-function-app/azurerm/<versione>")
```

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
