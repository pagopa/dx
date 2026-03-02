# Terraform DX Root Module - Azure Function App with Cosmos DB

Questo root module Terraform è stato generato utilizzando la skill **terraform-dx-best-practices-inline** che applica le convenzioni PagoPA DX usando esclusivamente conoscenza interna, senza consultare API, documentazione esterna o strumenti MCP.

## Architettura

Il modulo deploya i seguenti componenti Azure:

- **Function App** con runtime Node.js 20 su piano Consumption (Linux)
- **Storage Account** (Standard LRS) per la Function App e artefatti
- **Cosmos DB Account** con API NoSQL in modalità serverless
- **Application Insights** per monitoring e telemetria
- **Key Vault Secrets** per gestione sicura delle connection string

## Conformità DX

### ✅ Naming Convention

Tutti i nomi delle risorse utilizzano `provider::dx::resource_name()` del provider `pagopa-dx/azure`:

```hcl
provider::dx::resource_name(var.environment.env_short, "fn")    # Function App
provider::dx::resource_name(var.environment.env_short, "st")    # Storage Account
provider::dx::resource_name(var.environment.env_short, "cosmos") # Cosmos DB
```

### ✅ Tag Obbligatori

Tutte le risorse includono i 5 tag DX richiesti:

- `CostCenter` - Centro di costo
- `CreatedBy` - "Terraform" (fisso)
- `Environment` - Ambiente (da `var.environment.env_short`)
- `BusinessUnit` - Business unit responsabile
- `ManagementTeam` - Team di gestione

### ✅ Moduli DX Registry

Il codice utilizza moduli ufficiali dal Terraform Registry:

- `pagopa-dx/storage-account/azure` (~> 1.0)
- `pagopa-dx/function-app/azure` (~> 1.0)
- `pagopa-dx/cosmosdb-account/azure` (~> 1.0)

<!-- inline-assumption: Le versioni dei moduli (~> 1.0) sono indicative. In un contesto reale, verificare le versioni disponibili sul Terraform Registry. -->

### ✅ Gestione Segreti

Nessun valore sensibile è hardcoded. Tutti i segreti sono:

1. Salvati in **Azure Key Vault** tramite `azurerm_key_vault_secret`
2. Referenziati nelle app settings tramite sintassi `@Microsoft.KeyVault(SecretUri=...)`

Segreti gestiti:
- Storage Account connection string
- Cosmos DB connection string
- Application Insights instrumentation key

### ✅ Security Best Practices

- **Managed Identity**: Function App con System-Assigned Identity
- **RBAC**: Accesso a Key Vault e Cosmos DB tramite policy dedicate
- **TLS**: Storage Account con TLS 1.2 minimo
- **HTTPS**: Solo traffico HTTPS abilitato

## Struttura File

```
├── versions.tf      # Versioni Terraform e provider
├── providers.tf     # Configurazione provider (azurerm, dx)
├── variables.tf     # Variabili di input con validazione
├── locals.tf        # Valori computati localmente
├── main.tf          # Risorse principali
├── outputs.tf       # Output del modulo
└── README.md        # Questa documentazione
```

## Utilizzo

### Prerequisiti

- Terraform >= 1.9
- Azure CLI autenticato
- Key Vault esistente per la gestione segreti

### Esempio terraform.tfvars

```hcl
environment = {
  env_short = "dev"
  location  = "westeurope"
}

domain   = "my-project"
location = "westeurope"

tags = {
  CostCenter     = "IT-INFRA-001"
  BusinessUnit   = "Engineering"
  ManagementTeam = "Platform"
}

key_vault_id = "/subscriptions/.../resourceGroups/.../providers/Microsoft.KeyVault/vaults/my-kv"

function_app_settings = {
  "CUSTOM_SETTING" = "value"
}
```

### Deployment

```bash
terraform init
terraform plan
terraform apply
```

## Note sulla Skill Inline

### Metodologia

La skill **terraform-dx-best-practices-inline** ha generato questo codice:

1. **Senza consultare fonti esterne**: nessuna chiamata a API, documentazione online, MCP tools o subagent
2. **Basandosi su conoscenza interna**: convenzioni DX, pattern Terraform Azure, best practice security
3. **Con assunzioni esplicite**: dove la conoscenza è incerta, le assunzioni sono documentate

### Assunzioni Effettuate

Le seguenti assunzioni sono state fatte durante la generazione:

<!-- inline-assumption: Versioni moduli pagopa-dx/* settate a ~> 1.0 senza verifica del registry -->
<!-- inline-assumption: Sintassi provider::dx::resource_name() basata su conoscenza interna della struttura provider DX -->
<!-- inline-assumption: Nomi risorse ("fn", "st", "cosmos", "rg", "asp") seguono convenzioni interne PagoPA -->
<!-- inline-assumption: Attributi moduli (es. module.storage_account.name, module.function_app.identity_principal_id) assumono output standard -->

### Checklist DX (6 controlli)

- ✅ **validate**: Codice sintatticamente corretto (nessun errore `terraform validate` atteso)
- ✅ **naming**: `provider::dx::resource_name()` usato su TUTTI i nomi risorse Azure
- ✅ **tags**: Tutti i 5 tag obbligatori presenti (CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam)
- ✅ **secrets**: Nessun valore hardcoded, tutti i segreti in Key Vault con reference `@Microsoft.KeyVault(...)`
- ⚠️ **networking**: Non applicabile (Function App in Consumption plan non richiede subnet dedicate)
- ✅ **modules**: Moduli `pagopa-dx/*` con versione pinned `~> 1.0`

## Prossimi Passi

1. Verificare le versioni dei moduli sul Terraform Registry
2. Personalizzare le variabili in `terraform.tfvars`
3. Eseguire `terraform init` per scaricare i provider
4. Validare con `terraform plan`
5. Applicare con `terraform apply`

## Supporto

Per domande o problemi relativi alle convenzioni DX:
- Consultare la documentazione ufficiale: https://dx.pagopa.it/docs/
- Verificare i moduli disponibili sul Terraform Registry: https://registry.terraform.io/namespaces/pagopa-dx

---

**Generato da**: skill `terraform-dx-best-practices-inline`  
**Data generazione**: 2026-03-02  
**Modalità**: Solo conoscenza interna (no API, no MCP, no subagent)
