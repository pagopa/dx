---
name: terraform-dx-best-practices-subagent
description: Delega la ricerca delle best practice Terraform a un subagent DX, poi integra il risultato.
---

# Terraform DX Best Practices (Subagent)

Questa skill genera codice Terraform DX-compliant delegando la **ricerca documentazione** a un subagent specializzato, poi integra i risultati nella generazione.

## Procedura di delega (obbligatoria)

**Step 1 — Avvia subagent di ricerca**

Delega al subagent il compito di raccogliere:

1. Code style e struttura cartelle DX (da `https://api.dx.pagopa.it/search` o `fetch_webpage`)
2. Naming convention (`provider::dx::resource_name`) e provider `pagopa-dx/azure`
3. Elenco tag obbligatori (CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam)
4. **Lista completa di TUTTI i moduli disponibili** nel namespace `pagopa-dx` del Terraform Registry. Il subagent deve:
   - Chiamare `search_modules(moduleQuery="pagopa-dx")` (se MCP disponibile) oppure `GET https://registry.terraform.io/v1/modules/search?namespace=pagopa-dx&limit=50`
   - Restituire la lista completa con nome modulo e descrizione
   - Per ogni modulo rilevante al task dell'utente, recuperare inputs e versione con `get_module_details` / `get_latest_module_version`
5. Versioni più recenti dei moduli trovati al punto 4
6. Gestione segreti con Key Vault references
7. Pattern di networking (`dx_available_subnet_cidr`)

Il subagent può usare qualsiasi strumento disponibile (HTTP curl, MCP tools, `fetch_webpage`).
Istruisci il subagent a restituire un report strutturato con le informazioni raccolte.

**Step 2 — Integra i risultati**

Usa le informazioni restituite dal subagent per generare il codice Terraform. NON inventare dettagli non trovati dal subagent; se mancano, documentalo nel README con `<!-- subagent-gap: ... -->`.

**Module-first rule**: prima di scrivere qualsiasi blocco `resource`, verifica nella lista moduli restituita dal subagent se esiste un modulo `pagopa-dx/*` per quella risorsa. Il namespace copre molti tipi di risorse: role assignments, service bus, event hub, CDN, API management, container apps, ecc. **Usa il modulo se esiste.** Usa risorse raw solo come fallback.

**Step 3 — Genera il codice**

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

Il README deve includere un paragrafo "Processo di delega" che spiega cosa ha cercato il subagent e cosa ha trovato.
