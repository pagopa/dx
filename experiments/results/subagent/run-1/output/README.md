# Azure Infrastructure - Terraform Configuration

Terraform root module per progetto Azure con Function App (Node.js 20), Storage Account e Cosmos DB (NoSQL serverless), generato seguendo le best practice PagoPA DX.

## Processo di Delega (Subagent Research)

Questo codice è stato generato utilizzando la skill **terraform-dx-best-practices-subagent**, che ha delegato la ricerca della documentazione a un subagent specializzato.

### Cosa ha cercato il subagent

Il subagent ha raccolto informazioni su:

1. **Code style & struttura file**: Pattern DX per organizzazione dei file Terraform (`main.tf`, `variables.tf`, `outputs.tf`, `locals.tf`, `providers.tf`, `versions.tf`)
2. **Naming conventions**: Funzione `provider::dx::resource_name()` del provider `pagopa-dx/azure` per naming standardizzato
3. **Tag obbligatori**: Lista completa dei tag DX richiesti (`CostCenter`, `CreatedBy`, `Environment`, `BusinessUnit`, `ManagementTeam`)
4. **Moduli DX disponibili**: Moduli Terraform Registry `pagopa-dx/*` per Function App, Storage Account, Cosmos DB
5. **Versioni moduli**: Versioni più recenti tramite Terraform Registry API
6. **Secret management**: Pattern Key Vault references (`@Microsoft.KeyVault(...)`)
7. **Networking patterns**: Uso di `dx_available_subnet_cidr` per allocazione automatica CIDR

### Cosa ha trovato il subagent

#### ✅ Successi

- **Moduli DX identificati**:
  - `pagopa-dx/azure-function-app/azurerm` v4.3.0 (Node.js 20 support, subnet auto-creation, private endpoints)
  - `pagopa-dx/azure-storage-account/azurerm` v2.1.4 (blob/queue/table, private endpoints)
  - `pagopa-dx/azure-cosmos-account/azurerm` v0.4.0 (NoSQL API, private endpoints)

- **Provider versions**:
  - `hashicorp/azurerm` ~> 4.0 (latest: 4.62.0)
  - `pagopa-dx/azure` ~> 0.8 (latest: 0.8.3)

- **Naming function**: Documentazione completa su `provider::dx::resource_name()` con esempi di resource types (`function_app`, `storage_account`, `cosmos_db_nosql`)

- **Tag requirements**: Tutti i 6 tag obbligatori con valori standard e mapping environment (dev→Dev, uat→Uat, prod→Prod)

- **Secret management pattern**: Key Vault references con sintassi `@Microsoft.KeyVault(VaultName=...;SecretName=...)` e RBAC `Key Vault Secrets User`

- **Networking**: Pattern `dx_available_subnet_cidr` per allocazione automatica CIDR non sovrapposti

#### ⚠️ Gap identificati

<!-- subagent-gap: Cosmos DB serverless support -->
Il modulo DX `pagopa-dx/azure-cosmos-account` non documenta esplicitamente il supporto per modalità serverless. Il subagent ha fornito un esempio di risorsa raw `azurerm_cosmosdb_account` con `capabilities { name = "EnableServerless" }` come fallback (vedi `main.tf`, commentato con `count = 0`).

<!-- subagent-gap: Application Insights creation -->
Il modulo Function App richiede `application_insights_connection_string` come input, ma il subagent non ha trovato documentazione su come creare/referenziare la risorsa Application Insights. La variabile è stata esposta come input obbligatorio.

<!-- subagent-gap: Private DNS Zone configuration -->
I moduli DX creano private endpoint ma non documentano la configurazione delle Private DNS Zone. Potrebbero essere necessarie zone DNS aggiuntive per la risoluzione dei nomi privati.

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│ Resource Group (dx-named)                                   │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐             │
│  │ Function App     │───▶│ Storage Account  │             │
│  │ (Node.js 20)     │    │ (blob/queue/tbl) │             │
│  │ - Subnet integ.  │    │ - Private EP     │             │
│  │ - Private EP     │    │ - Containers     │             │
│  │ - App Insights   │    └──────────────────┘             │
│  │ - Managed ID     │                                      │
│  └────────┬─────────┘    ┌──────────────────┐             │
│           │              │ Cosmos DB        │             │
│           └─────────────▶│ (NoSQL serverles)│             │
│                          │ - Private EP     │             │
│                          │ - Session consis.│             │
│                          └──────────────────┘             │
│                                   │                        │
│                          ┌────────▼────────┐              │
│                          │ Key Vault       │              │
│                          │ (secrets store) │              │
│                          │ - Cosmos key    │              │
│                          │ - Storage conn  │              │
│                          └─────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Struttura File

- **`versions.tf`**: Terraform version constraints, required providers
- **`providers.tf`**: Provider configurations (azurerm, dx)
- **`variables.tf`**: Input variables con validazioni
- **`locals.tf`**: Naming configuration, resource names via `provider::dx::resource_name()`, tag obbligatori
- **`data.tf`**: Data sources (VNet, Key Vault)
- **`main.tf`**: Risorse principali (Resource Group, moduli DX, Cosmos DB database/container, Key Vault secrets, RBAC)
- **`outputs.tf`**: Output values (resource IDs, names, endpoints)

## Requisiti Prerequisiti

Prima di applicare questo modulo, assicurati di avere:

1. **Virtual Network esistente** con:
   - Subnet per private endpoints (referenziata in `var.subnet_pep_id`)
   - Indirizzo disponibile per subnet Function App (creata automaticamente dal modulo se `subnet_cidr = null`)

2. **Key Vault esistente** con:
   - RBAC abilitato (o access policies configurate)
   - Il principal che esegue Terraform deve avere permessi `Key Vault Secrets Officer` per creare secrets

3. **Application Insights** esistente:
   - Connection string da passare in `var.application_insights_connection_string`

4. **Private DNS Zones** (opzionale, ma consigliato):
   - `privatelink.azurewebsites.net` (Function App)
   - `privatelink.blob.core.windows.net` (Storage blob)
   - `privatelink.queue.core.windows.net` (Storage queue)
   - `privatelink.table.core.windows.net` (Storage table)
   - `privatelink.documents.azure.com` (Cosmos DB)

## Uso

### 1. Inizializza Terraform

```bash
terraform init
```

### 2. Crea file `terraform.tfvars`

```hcl
environment = {
  prefix          = "myapp"
  env_short       = "d"           # d = Dev, u = Uat, p = Prod
  location        = "italynorth"
  domain          = null
  app_name        = "backend"
  instance_number = "01"
}

business_unit   = "DevEx"
management_team = "Developer Experience"

virtual_network = {
  name                = "vnet-italynorth-dev"
  resource_group_name = "rg-network-dev"
}

subnet_pep_id = "/subscriptions/<sub-id>/resourceGroups/rg-network-dev/providers/Microsoft.Network/virtualNetworks/vnet-italynorth-dev/subnets/snet-pep"

key_vault_name                = "kv-myapp-d-italynorth-01"
key_vault_resource_group_name = "rg-security-dev"

application_insights_connection_string = "InstrumentationKey=...;IngestionEndpoint=..."

function_node_version      = 20
cosmos_consistency_preset  = "default"  # Session consistency
```

### 3. Plan e Apply

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

## Naming Convention (DX Provider)

Tutti i nomi delle risorse sono generati tramite `provider::dx::resource_name()`:

| Resource Type         | Naming Pattern                                    | Example                              |
|-----------------------|---------------------------------------------------|--------------------------------------|
| Resource Group        | `{prefix}-{region}-{env}-{domain}-{app}-rg-{num}` | `myapp-itn-d-backend-rg-01`          |
| Function App          | `{prefix}-{region}-{env}-{domain}-{app}-func-{num}`| `myapp-itn-d-backend-func-01`        |
| Storage Account       | `{prefix}{region}{env}{domain}{app}st{num}`      | `myappitndbackendst01`               |
| Cosmos DB (NoSQL)     | `{prefix}-{region}-{env}-{domain}-{app}-cosno-{num}`| `myapp-itn-d-backend-cosno-01`      |

## Tag Obbligatori (DX)

Tutti i tag obbligatori sono applicati a tutte le risorse tramite `local.tags`:

| Tag            | Valore                              | Note                                      |
|----------------|-------------------------------------|-------------------------------------------|
| CostCenter     | TS000 - Tecnologia e Servizi        | Centro di costo standard                  |
| CreatedBy      | Terraform                           | Sempre "Terraform"                        |
| Environment    | Dev / Uat / Prod                    | Basato su `env_short` (d/u/p)             |
| BusinessUnit   | DevEx                               | Variabile: `var.business_unit`            |
| ManagementTeam | Developer Experience                | Variabile: `var.management_team`          |

## Secret Management

I segreti sensibili sono:

1. **Generati** dalle risorse (Cosmos primary key, Storage connection string)
2. **Salvati in Key Vault** tramite `azurerm_key_vault_secret`
3. **Referenziati** nelle app settings della Function App tramite `@Microsoft.KeyVault(...)`

**RBAC**: La Function App riceve automaticamente il ruolo `Key Vault Secrets User` sul Key Vault tramite managed identity.

**Esempio app setting**:
```hcl
"COSMOS_DB_KEY" = "@Microsoft.KeyVault(VaultName=kv-myapp-d-italynorth-01;SecretName=cosmos-primary-key)"
```

## Moduli DX Utilizzati

| Modulo                                      | Versione | Scopo                                    |
|---------------------------------------------|----------|------------------------------------------|
| `pagopa-dx/azure-function-app/azurerm`      | ~> 4.3   | Function App con subnet integration, PE  |
| `pagopa-dx/azure-storage-account/azurerm`   | ~> 2.1   | Storage Account con blob/queue/table, PE |
| `pagopa-dx/azure-cosmos-account/azurerm`    | ~> 0.4   | Cosmos DB Account con NoSQL API, PE      |

## Validazione Checklist

- [x] **validate**: Codice sintatticamente valido
- [x] **naming**: `provider::dx::resource_name()` su tutti i nomi risorse (RG, Function App, Storage, Cosmos DB)
- [x] **tags**: Tutti i 6 tag obbligatori applicati (`CostCenter`, `CreatedBy`, `Environment`, `BusinessUnit`, `ManagementTeam`)
- [x] **secrets**: Nessun valore hardcoded; Cosmos key e Storage connection string salvati in Key Vault e referenziati
- [ ] **networking**: `dx_available_subnet_cidr` non usato (subnet Function App creata automaticamente dal modulo con `subnet_cidr = null`)
- [x] **modules**: Moduli `pagopa-dx/*` con versioni pinned `~> major.minor`

## Note Implementative

### Cosmos DB Serverless

Il modulo DX `pagopa-dx/azure-cosmos-account` v0.4.0 potrebbe non supportare esplicitamente la modalità serverless tramite il parametro `use_case`. Nel file `main.tf` è presente una risorsa raw `azurerm_cosmosdb_account` commentata (`count = 0`) come fallback per abilitare serverless tramite:

```hcl
capabilities {
  name = "EnableServerless"
}
```

**Action required**: Verificare se il modulo DX supporta serverless. Se no, rimuovere il modulo Cosmos DB e decommentare la risorsa raw.

### Function App Subnet

Il modulo `pagopa-dx/azure-function-app` supporta:
- `subnet_cidr = "10.0.1.0/24"` → Crea subnet con CIDR specificato
- `subnet_cidr = null` → Crea subnet con allocazione automatica CIDR

In questa configurazione è usato `subnet_cidr = null` per delegare al modulo l'allocazione automatica.

### Application Insights

La risorsa Application Insights non è gestita in questo modulo; si assume esistente. Il connection string è passato come input sensibile `var.application_insights_connection_string`.

Se necessario creare Application Insights nello stesso modulo:

```hcl
resource "azurerm_application_insights" "ai" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "application_insights" }))
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
  tags                = local.tags
}
```

## Output

Gli output espongono:

- **Resource Group**: ID, name, location
- **Function App**: ID, name, default hostname, managed identity principal ID
- **Storage Account**: ID, name, primary blob host
- **Cosmos DB Account**: ID, name, endpoint (sensitive)
- **Cosmos Database**: ID, name
- **Cosmos Container**: ID, name

## Risoluzione Problemi

### Key Vault Access Denied

Se Terraform fallisce con errori di accesso a Key Vault:
1. Verifica che il principal corrente abbia ruolo `Key Vault Secrets Officer` sul Key Vault
2. Se Key Vault usa Access Policies invece di RBAC, aggiungi policy per il principal corrente

### Private Endpoint DNS Resolution

I private endpoint richiedono Private DNS Zone per la risoluzione dei nomi. Se i nomi privati non si risolvono:
1. Crea le Private DNS Zone necessarie (vedi sezione Prerequisiti)
2. Collega le zone alla VNet
3. I moduli DX dovrebbero creare automaticamente i record DNS se `private_dns_zone_resource_group_name` è fornito (parametro opzionale non usato in questa configurazione)

### Cosmos DB Serverless

Se il deployment Cosmos DB fallisce con errori relativi al provisioned throughput:
- Il modulo DX potrebbe non supportare serverless
- Usa la risorsa raw commentata in `main.tf` (decommentare e rimuovere il modulo)

## Riferimenti

- [DX Documentation](https://dx.pagopa.it/docs/terraform/)
- [DX Search API](https://api.dx.pagopa.it/search)
- [pagopa-dx/azure-function-app](https://registry.terraform.io/modules/pagopa-dx/azure-function-app/azurerm/latest)
- [pagopa-dx/azure-storage-account](https://registry.terraform.io/modules/pagopa-dx/azure-storage-account/azurerm/latest)
- [pagopa-dx/azure-cosmos-account](https://registry.terraform.io/modules/pagopa-dx/azure-cosmos-account/azurerm/latest)

---

**Generato da**: Skill `terraform-dx-best-practices-subagent`  
**Data**: 2026-03-02  
**Subagent research**: Completato con successo (vedi sezione "Processo di Delega")
