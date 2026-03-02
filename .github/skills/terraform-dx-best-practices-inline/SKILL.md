---
name: terraform-dx-best-practices-inline
description: Applica le best practice DX solo tramite conoscenza interna, senza consultare API, documentazione esterna o strumenti MCP.
---

# Terraform DX Best Practices (Inline)

Questa skill genera codice Terraform DX-compliant usando **esclusivamente la conoscenza interna** dell'agente, senza consultare API, documentazione esterna, strumenti MCP o subagent.

## Fonte di conoscenza

- Usa la conoscenza interna già nota su PagoPA DX e le sue convenzioni Terraform.
- NON fare richieste HTTP, NON usare tool MCP, NON delegare a subagent.
- Se non ricordi con certezza un dettaglio (es. versione modulo), indicalo esplicitamente nel README con una nota `<!-- inline-assumption: ... -->`.

## Regole di generazione obbligatorie

Seguire la skill base `terraform-dx-best-practices`. In aggiunta:

### Naming
- Configura il provider `pagopa-dx/azure` con alias `dx` nel blocco `required_providers`.
- Usa SEMPRE `provider::dx::resource_name()` per tutti i nomi delle risorse Azure.
- Sintassi: `provider::dx::resource_name(environment, "tipo-risorsa")` dove `tipo-risorsa` è il suffisso usato internamente (es. `"fn"` per Function App, `"st"` per Storage Account).

### Tag obbligatori
Ogni risorsa DEVE includere questi tag:
```hcl
tags = merge(var.tags, {
  CostCenter     = var.tags.CostCenter
  CreatedBy      = "Terraform"
  Environment    = var.environment.env_short
  BusinessUnit   = var.tags.BusinessUnit
  ManagementTeam = var.tags.ManagementTeam
})
```

### Moduli DX Registry
- Usa moduli `pagopa-dx/*` dal Terraform Registry per Function App, Storage Account, Cosmos DB ecc.
- Specifica la versione con `~> major.minor` (es. `~> 1.0`).
- Usa risorse azurerm raw solo se non esiste un modulo DX.

### Segreti
- NESSUN valore hardcoded per password, connection string, chiavi.
- Usa `azurerm_key_vault_secret` o riferimenti `@Microsoft.KeyVault(...)` nelle app settings.

### Struttura file
Genera sempre file separati: `main.tf`, `variables.tf`, `outputs.tf`, `locals.tf`, `providers.tf`, `versions.tf`.

## Checklist di autovalutazione (6 check)

Prima di restituire il codice, verifica:
- [ ] `validate`: il codice è sintatticamente valido (nessun errore `terraform validate`)
- [ ] `naming`: `provider::dx::resource_name()` usato su TUTTI i nomi risorse
- [ ] `tags`: tutti e 5 i tag obbligatori presenti (CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam)
- [ ] `secrets`: nessun valore hardcoded, usa KV references
- [ ] `networking`: sottoreti usano `dx_available_subnet_cidr` se sono richieste subnet dedicate
- [ ] `modules`: almeno un modulo `pagopa-dx/*` con `version` pinned `~>`

## Output atteso

File da produrre nella cartella di output:
```
main.tf        # risorse principali
variables.tf   # variabili di input
outputs.tf     # output del modulo
locals.tf      # valori computati localmente
providers.tf   # configurazione provider (pagopa-dx/azure, azurerm)
versions.tf    # required_providers e versioni
README.md      # note sulla skill e sulle assunzioni fatte
```