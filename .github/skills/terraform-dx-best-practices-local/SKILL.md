---
name: terraform-dx-best-practices-local
description: Usa solo la documentazione locale allegata (es. code-style.md, required-tags.md) per generare output Terraform.
---

# Terraform DX Best Practices (Local)

Questa skill genera codice Terraform DX-compliant leggendo **esclusivamente la documentazione locale allegata** dalla cartella `apps/website/docs/terraform/` del workspace.

## File di documentazione da leggere (obbligatorio)

Leggi questi file tramite il tool `read_file` (o `cat`) PRIMA di generare qualsiasi codice:

```
apps/website/docs/terraform/code-style.md
apps/website/docs/terraform/required-tags.md
apps/website/docs/terraform/naming-convention.md
apps/website/docs/terraform/folder-structure.md
apps/website/docs/terraform/modules.md
apps/website/docs/terraform/secrets.md
apps/website/docs/terraform/networking.md
apps/website/docs/terraform/provider-dx.md
apps/website/docs/terraform/pre-commit.md
apps/website/docs/terraform/versioning.md
```

Se un file non esiste, documenta il fatto nel README con `<!-- local-missing: <nome-file> -->` e usa la conoscenza della skill base come fallback.

**NON usare**: DX Search API, internet, `fetch_webpage`, tool MCP, conoscenza interna non derivata dai file sopra.

## Regole di generazione obbligatorie

Seguire le istruzioni nella skill base `terraform-dx-best-practices`. In particolare:

### Naming

- Leggi `provider-dx.md` o `naming-convention.md` per la sintassi di `provider::dx::resource_name()`.

### Tag

- Leggi `required-tags.md` per l'elenco completo dei tag obbligatori.

### Moduli

- Leggi `modules.md` per i moduli `pagopa-dx/*` disponibili e le versioni.

### Segreti

- Leggi `secrets.md` per i pattern Key Vault.

### File di output

- Leggi `code-style.md` e `folder-structure.md` per la struttura cartelle.

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

Il README deve citare quali file locali sono stati letti e le loro informazioni chiave.
