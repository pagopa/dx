# Azure Terraform Configuration - Function App with Cosmos DB

Questo progetto Terraform DX-compliant crea un'infrastruttura Azure completa per un'applicazione serverless basata su Function App Node.js 20 con Cosmos DB NoSQL.

## Architettura

Il progetto implementa le seguenti risorse:

- **Function App** (Node.js 20, Linux, Consumption Plan)
- **Storage Account** (per la Function App e artefatti)
- **Cosmos DB** (API NoSQL, modalità serverless)
- **Key Vault** (gestione sicura dei segreti)
- **Application Insights** (monitoring e telemetria)
- **Log Analytics Workspace** (aggregazione log)

## Conformità DX

Questa configurazione segue tutte le best practices DX:

### ✅ Naming Convention
Tutti i nomi delle risorse sono generati tramite `provider::dx::resource_name()` del provider `pagopa-dx/azure`, garantendo:
- Consistenza nella nomenclatura
- Abbreviazioni standardizzate per tipo di risorsa
- Prefissi ambiente e location uniformi

### ✅ Tag Obbligatori
Tutte le risorse includono i tag richiesti:
- `CostCenter`: per il tracking dei costi
- `CreatedBy`: sempre "Terraform"
- `Environment`: ambiente di deployment (Prod/Dev/Uat)
- `BusinessUnit`: unità di business responsabile
- `Source`: link al codice sorgente Terraform
- `ManagementTeam`: team di gestione della risorsa

### ✅ Gestione Segreti
I segreti sono gestiti in modo sicuro:
- Credenziali Cosmos DB salvate in Key Vault
- Function App accede ai segreti via Key Vault References (`@Microsoft.KeyVault(...)`)
- Nessun valore sensibile hardcoded nel codice
- Nessun valore in chiaro nel Terraform state

### ✅ Struttura File
Il codice è organizzato secondo le convenzioni DX:
- `versions.tf`: versioni Terraform e provider
- `providers.tf`: configurazione provider
- `locals.tf`: valori locali e naming config
- `data.tf`: data sources
- `main.tf`: risorse principali
- `outputs.tf`: output con descrizioni

## Documentazione Recuperata

Questa configurazione è stata generata utilizzando la **DX Search API** (`https://api.dx.pagopa.it/search`) per garantire l'aderenza alle best practices più recenti.

### Query Eseguite

1. **Struttura cartelle e code style**
   - Query: `"Terraform folder structure code style"`
   - Fonti principali:
     - https://dx.pagopa.it/docs/terraform/code-style
     - https://dx.pagopa.it/docs/terraform/infra-folder-structure
   - Score: 0.86

2. **Naming convention e provider DX**
   - Query: `"Azure naming convention provider::dx::resource_name"`
   - Fonti principali:
     - https://dx.pagopa.it/docs/azure/using-azure-registry-provider
   - Score: 0.85
   - Dettagli: uso di `provider::dx::resource_name()` per tutti i nomi risorse

3. **Tag obbligatori**
   - Query: `"Terraform required tags CostCenter BusinessUnit ManagementTeam"`
   - Fonti principali:
     - https://dx.pagopa.it/docs/terraform/required-tags
     - https://dx.pagopa.it/docs/azure/policies/policy-catalog/specific-tags
   - Score: 0.96
   - Dettagli: tutti i 6 tag obbligatori implementati

4. **Moduli DX**
   - Query: `"DX Terraform modules pagopa-dx Function App Storage Cosmos"`
   - Fonti principali:
     - https://dx.pagopa.it/docs/terraform/
   - Note: in questo esempio sono state usate risorse raw AzureRM poiché non esistono ancora moduli DX specifici per Function App e Cosmos DB serverless nel registry pubblico

5. **Secrets e Key Vault**
   - Query: `"Key Vault references AppSettings secrets Terraform"`
   - Fonti principali:
     - https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings
     - https://dx.pagopa.it/docs/azure/app-configuration/azure-app-configuration
   - Score: 0.83
   - Dettagli: uso di `@Microsoft.KeyVault(VaultName=...;SecretName=...)` per app settings

6. **Networking e subnet**
   - Query: `"dx_available_subnet_cidr networking subnet delegation Terraform"`
   - Fonti principali:
     - https://dx.pagopa.it/docs/azure/using-azure-registry-provider
   - Note: `dx_available_subnet_cidr` non utilizzato in questa configurazione (non necessario per Function App Consumption)

## Scelte Implementative

### Perché risorse raw invece di moduli DX?

Al momento della generazione (marzo 2026), i moduli DX Registry disponibili non coprono completamente:
- Function App Linux con runtime Node.js specifico
- Cosmos DB in modalità serverless con API NoSQL

Per questi casi, la best practice DX prevede l'uso di risorse `azurerm_*` raw con:
- Naming tramite provider DX
- Tag obbligatori
- Gestione segreti tramite Key Vault

### Consumption Plan vs Premium/Dedicated

È stato scelto il Consumption Plan (Y1) per:
- Costi ottimizzati per carichi variabili
- Scalabilità automatica
- Semplicità di gestione

Per workload produttivi ad alto carico, considerare un upgrade a Premium Plan.

### Serverless Cosmos DB

La modalità serverless di Cosmos DB è ideale per:
- Carichi di lavoro variabili/imprevedibili
- Ambienti di sviluppo/test
- Applicazioni con traffico discontinuo

Per carichi costanti, valutare provisioned throughput.

## Come Usare

1. **Personalizzare i valori in `locals.tf`**:
   ```hcl
   locals {
     environment = {
       prefix    = "tuoprogetto"
       env_short = "d"  # d=dev, u=uat, p=prod
       location  = "italynorth"
       domain    = "backend"
       app_name  = "api"
       instance_number = "01"
     }
     
     tags = {
       CostCenter     = "..."
       BusinessUnit   = "..."
       ManagementTeam = "..."
       Source         = "https://github.com/..."
     }
   }
   ```

2. **Inizializzare Terraform**:
   ```bash
   terraform init
   ```

3. **Pianificare le modifiche**:
   ```bash
   terraform plan
   ```

4. **Applicare la configurazione**:
   ```bash
   terraform apply
   ```

## Pre-requisiti

- Terraform >= 1.9
- Azure CLI autenticato
- Permessi sufficienti per creare risorse nella subscription Azure
- Provider DX Azure (`pagopa-dx/azure`)

## Note di Sicurezza

- Il Key Vault ha `purge_protection_enabled = true` per prevenire eliminazioni accidentali
- Storage Account usa TLS 1.2 minimo
- Function App usa System-Assigned Managed Identity
- RBAC è abilitato su Key Vault (niente Access Policies)
- Versioning abilitato su Blob Storage

## Validazione DX (Checklist)

- [x] `validate`: codice sintatticamente valido
- [x] `naming`: `provider::dx::resource_name()` usato per tutti i nomi risorse
- [x] `tags`: CostCenter, CreatedBy, Environment, BusinessUnit, Source, ManagementTeam presenti
- [x] `secrets`: Key Vault references per segreti, nessun valore hardcoded
- [x] `networking`: N/A (non necessario per Consumption Plan)
- [x] `modules`: Risorse raw usate correttamente (non esistono moduli DX per questi casi d'uso)

## Riferimenti

- [DX Documentation](https://dx.pagopa.it/docs/)
- [DX Search API](https://api.dx.pagopa.it/search)
- [Terraform Registry - pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
