---
name: terraform-dx-best-practices-rag
description: Recupera best practice DX interrogando la DX Search API (https://api.dx.pagopa.it/search) e integra i risultati nella generazione.
---

# Terraform DX Best Practices (RAG)

Questa skill genera codice Terraform DX-compliant recuperando la documentazione tramite la **DX Search API** (`https://api.dx.pagopa.it/search`) prima di scrivere qualsiasi codice.

## Procedura di retrieval (obbligatoria)

Esegui le seguenti query POST prima di generare il codice. Eseguile usando il tool `bash` o equivalente:

```bash
# 1. Struttura cartelle e code style
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Terraform folder structure code style", "number_of_results": 5}'

# 2. Naming convention e provider DX
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Azure naming convention provider::dx::resource_name", "number_of_results": 5}'

# 3. Tag obbligatori
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Terraform required tags CostCenter BusinessUnit ManagementTeam", "number_of_results": 5}'

# 4. Moduli DX nel registry
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "DX Terraform modules pagopa-dx Function App Storage Cosmos", "number_of_results": 5}'

# 5. Secrets e Key Vault
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "Key Vault references AppSettings secrets Terraform", "number_of_results": 5}'

# 6. Networking e subnet
curl -s -X POST https://api.dx.pagopa.it/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "dx_available_subnet_cidr networking subnet delegation Terraform", "number_of_results": 5}'
```

La risposta JSON ha struttura:
```json
{ "query": "...", "results": [{"content": "...", "score": 0.9, "source": "https://..."}] }
```

**Integra i risultati nella generazione**: cita le fonti nel README finale.

## Regole di generazione obbligatorie

Seguire la skill base `terraform-dx-best-practices` per tutti i dettagli su naming, tag, moduli, segreti e struttura file.

## Checklist di autovalutazione (6 check)

- [ ] `validate`: il codice è sintatticamente valido
- [ ] `naming`: `provider::dx::resource_name()` usato su TUTTI i nomi risorse
- [ ] `tags`: CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam presenti
- [ ] `secrets`: nessun valore hardcoded, usa KV references
- [ ] `networking`: `dx_available_subnet_cidr` per le subnet dedicate
- [ ] `modules`: almeno un modulo `pagopa-dx/*` con `version` pinned `~>`

## Output atteso

```
main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf, README.md
```

Il README deve includere le query eseguite e le fonti trovate dalla Search API.