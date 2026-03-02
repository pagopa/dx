---
name: terraform-dx-best-practices-website-crawl
description: Recupera tutto solo tramite fetch_webpage sulle pagine https://dx.pagopa.it/docs/terraform/. Vietato usare altre fonti o memoria. Se fetch_webpage non è disponibile, rispondi che non puoi completare il task.
---

Questa skill genera codice Terraform DX-compliant recuperando **ogni informazione** tramite `fetch_webpage` sulle pagine ufficiali https://dx.pagopa.it/docs/terraform/.

## Procedura di retrieval (obbligatoria)

**È VIETATO** usare: DX Search API, tool MCP, documentazione locale allegata, conoscenza interna, memoria. Se `fetch_webpage` non è disponibile, dichiarare che non si può completare il task.

### Pagine da visitare con fetch_webpage

Visita queste URL con `fetch_webpage` e segui i link interni trovati:

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
https://registry.terraform.io/namespaces/pagopa-dx
https://registry.terraform.io/modules/pagopa-dx/azure-function-app/azurerm/latest
https://registry.terraform.io/modules/pagopa-dx/azure-storage-account/azurerm/latest
```

Per ogni pagina, estrai: esempi di codice, regole, configurazioni.

## Regole di generazione obbligatorie

Seguire la skill base `terraform-dx-best-practices` per naming, tag, moduli, segreti e struttura file.

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

Il README deve elencare le URL visitate tramite `fetch_webpage` e le informazioni chiave estratte.
