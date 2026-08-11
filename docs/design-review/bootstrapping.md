# Design Review — Bootstrapping DX su Azure

## L'esigenza

Il framework DX nasce perché, prima della sua esistenza, il bootstrap di un nuovo prodotto o repository era un'attività **interamente manuale e non normata**.
Infatti, non esistevano né una sequenza condivisa né regole comuni su naming, scope dei ruoli e confini di responsabilità. Le conseguenze dirette erano:

- **errori**: risorse create con naming divergente, ruoli assegnati a scope più ampi del necessario o mancanti, federated credential con subject sbagliato, secret non allineati fra Azure e GitHub;
- **configurazioni duplicate**: ogni repository riscriveva gli stessi blocchi Terraform e gli stessi workflow, che poi divergevano nel tempo;
- **risultati non uniformi**: due prodotti apparentemente identici arrivavano a topologie diverse, rendendo impossibile ragionare per convenzione;
- **troubleshooting difficile**: senza una convenzione condivisa, il debug di un fallimento richiedeva di ricostruire caso per caso.
  Il framework DX esiste per sostituire questo processo manuale con un **golden path** eseguibile, ripetibile, testabile e verificabile.

## L'esito atteso dell'iniziativa

- **Standardizzare** la topologia di bootstrap: stessa struttura di repository, stessi nomi di risorsa, stessi GitHub environment e stessi confini di ruolo per tutti i prodotti.
- **Automatizzare** i passaggi meccanici: scaffolding del monorepo, creazione delle risorse di bootstrap, configurazione OIDC e secret, generazione dei moduli Terraform e dei workflow.
- **Ridurre errori e duplicazioni** spostando la logica ricorrente dentro moduli versionati anziché dentro copie locali.
- **Rendere esplicite responsabilità e controlli**: chi esegue, chi approva, chi possiede il desired state, quale gate resta umano.
- **Abilitare il troubleshooting** grazie a naming deterministico e a una separazione netta fra stato locale, stato Terraform remoto, configurazione GitHub e configurazione Entra/RBAC.

## Attori del sistema

| Attore                                                                       | Responsabilità nel flusso                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Engineer del product team**                                                | Raccoglie gli input (subscription, environment, prefix, dominio, tag), esegue `dx init` e `dx add environment`, revisiona gli artefatti generati, apre o completa le PR manuali, svolge il troubleshooting di primo livello.                    |
| **Engineering Leader (EL)**                                                  | Nel flusso AS-IS esegue o approva le operazioni privilegiate: dispone dei ruoli richiesti sulle subscription, coordina e in genere esegue gli apply iniziali di `core` e `bootstrapper` (`apps/website/docs/monorepository-setup.mdx:244-285`). |
| **DX Team**                                                                  | Mantiene CLI, template, moduli Terraform, action/workflow riusabili, convenzioni e documentazione; è owner delle correzioni ai gap rilevati.                                                                                                    |
| **DX CLI** (`apps/cli`)                                                      | Orchestra precondition, prompt, discovery, provisioning diretto via SDK, scaffolding, sincronizzazione GitHub e apertura best-effort della PR di autorizzazione Azure.                                                                          |
| **Principal locale Azure CLI**                                               | È il vero _grantor_ delle risorse e degli assignment creati direttamente dal CLI. Il controllo dei suoi permessi considera anche i gruppi Entra transitivi (`apps/cli/src/adapters/azure/cloud-account-service.ts:925-968`).                    |
| **Credenziale GitHub dell'utente**                                           | Crea repository, branch e PR, environment e secret GitHub, e modifica il repository esterno di autorizzazione Azure. Risolta da `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth login` (`apps/website/docs/dx-cli/requirements.md`).                     |
| **GitHub organization e repository target**                                  | Ospitano monorepo, branch iniziale, PR di scaffolding, environment CI/CD, secret, policy di branch e workflow.                                                                                                                                  |
| **GitHub App del prodotto**                                                  | Autentica e gestisce i self-hosted runner. Le sue credenziali (App ID, Client ID, Installation ID, private key PEM) sono input obbligatori di `add environment` in fase di inizializzazione.                                                    |
| **GitHub App Admin / team `engineering-cloud`**                              | Crea e governa la GitHub App e approva le modifiche al relativo repository di autorizzazione (`apps/website/docs/monorepository-setup.mdx:118-185`).                                                                                            |
| **`eng-github-authorization` e relativi CODEOWNER**                          | Registrano repository, team/collaborator e associazione del repository alla GitHub App tramite PR esterna e pipeline dedicata.                                                                                                                  |
| **Azure Resource Manager e Microsoft Graph / Entra ID**                      | Espongono subscription, gruppi transitivi, resource provider, resource group, managed identity, federated credential e RBAC.                                                                                                                    |
| **`eng-azure-authorization` e relativi CODEOWNER**                           | Creano/aggiornano gruppi Entra, membership, ruoli a scope subscription e la lista Directory Readers dopo il merge della PR.                                                                                                                     |
| **Pipeline di autorizzazione Azure**                                         | Esegue `plan` sulla PR e `apply` su `main`, applicando la configurazione della subscription contenuta in `src/azure-subscriptions/subscriptions/<subscription>/terraform.tfvars.json`.                                                          |
| **Modulo `github-environment-bootstrap`** (`infra/repository`)               | Crea e governa repository GitHub, environment, branch protection e workflow permission (`infra/modules/github_environment_bootstrap`). Il suo state nasce **locale** e va migrato.                                                              |
| **Modulo `azure-core-infra`** (`infra/core/<env>`)                           | Crea la baseline condivisa: resource group `common`/`network`/`github-runner`/`opex`, rete, VPN/DNS, Key Vault, Log Analytics, Application Insights, ambiente runner e **custom role DX** (`infra/modules/azure_core_infra/main.tf`).           |
| **Modulo `azure-github-environment-bootstrap`** (`infra/bootstrapper/<env>`) | Crea il resource group applicativo, le identity app/infra/opex CI/CD, i federated credential, i secret GitHub, il runner e i role assignment mirati (`infra/modules/azure_github_environment_bootstrap`).                                       |
| **Managed identity bootstrap CI/CD**                                         | Create direttamente dal CLI per rendere eseguibile il workflow `bootstrapper` prima che esistano le identity definitive del modulo.                                                                                                             |
| **Managed identity app/infra/opex CI/CD**                                    | Create dal modulo `bootstrapper`; sono i principal operativi dei workflow steady-state.                                                                                                                                                         |
| **Terraform backend Azure**                                                  | Conserva state e lock di `core` e `bootstrapper`; è creato direttamente dal CLI se assente (`cloud-account-service.ts:511-614`).                                                                                                                |
| **Self-hosted GitHub runner**                                                | Esegue workload con accesso alla rete privata; creato dal modulo `bootstrapper` riusando l'ambiente Container App e il Key Vault predisposti.                                                                                                   |

### Diagramma di system context

```mermaid
flowchart LR
  subgraph Persone
    ENG["Engineer product team"]
    EL["Engineering Leader"]
    APPADM["GitHub App Admin / engineering-cloud"]
  end

  subgraph Automazione
    CLI["DX CLI"]
    TFREPO["Terraform infra/repository"]
    TFCORE["Terraform infra/core"]
    TFBOOT["Terraform infra/bootstrapper"]
    GHA["GitHub Actions workflow bootstrapper"]
  end

  subgraph GitHub
    REPO["Repository monorepo"]
    ENVS["Environment e secret"]
    GHAPP["GitHub App runner"]
    AUTHGH["eng-github-authorization"]
    AUTHAZ["eng-azure-authorization"]
  end

  subgraph Azure
    ARM["Azure Resource Manager"]
    ENTRA["Entra ID / Microsoft Graph"]
    STATE["Storage Account Terraform state"]
    RUNNER["Self-hosted runner"]
  end


  ENG --> CLI
  EL --> TFCORE
  EL --> TFBOOT
  CLI --> TFREPO
  CLI --> ARM
  CLI --> ENTRA
  CLI --> ENVS
  CLI --> STATE
  CLI --> AUTHAZ
  TFREPO --> REPO
  TFREPO --> ENVS
  TFCORE --> ARM
  TFBOOT --> ARM
  TFBOOT --> ENVS
  TFBOOT --> RUNNER
  GHA --> TFBOOT
  GHA --> TFCORE
  GHAPP --> RUNNER
  APPADM --> GHAPP
  APPADM --> AUTHGH
  AUTHAZ --> ENTRA
  AUTHGH --> REPO
```

## Casi d'uso

### Must have

| Caso d'uso                                                   | Descrizione                                                                                                                                                               | Evidenza                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Creazione di un nuovo monorepository                         | `dx init` genera workspace, dotfile e `infra/repository`, opzionalmente crea il repository GitHub, il branch `features/scaffold-workspace` e la PR `Scaffold repository`. | `apps/cli/src/adapters/commander/commands/init.ts:564-609`             |
| Inizializzazione di una subscription nuova                   | `dx add environment` registra i provider, crea bootstrap RG, identity CD/CI, OIDC, secret, Key Vault e, se serve, il backend Terraform.                                   | `apps/cli/src/adapters/azure/cloud-account-service.ts:315-462`         |
| Aggiunta di un environment su subscription già inizializzata | Il ramo "initialized" salta l'inizializzazione ma riconfigura comunque OIDC e secret, perché sono repository-specific, e genera solo il `bootstrapper`.                   | `apps/cli/src/adapters/plop/generators/environment/actions.ts:78-108`  |
| Multi-subscription per lo stesso environment                 | Selezione di più cloud account con location per account; il backend è ospitato su una sola subscription.                                                                  | `apps/cli/src/adapters/plop/generators/environment/prompts.ts:496-509` |
| Re-run / retry                                               | Le azioni di scaffolding usano `addMany` con `force: true` e le risorse Azure usano `createOrUpdate`, rendendo la maggior parte del flusso ri-eseguibile.                 | `apps/cli/src/adapters/plop/generators/environment/actions.ts:26-48`   |
| Onboarding di un nuovo team su un prodotto esistente         | Riuso della GitHub App e dei gruppi Entra già esistenti, con solo il ramo repository-specific da eseguire.                                                                | `apps/website/docs/monorepository-setup.mdx:121-136`                   |

### Nice to have

| Caso d'uso                                                                            | Stato attuale                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrazione automatica dello state di `infra/repository` sul backend remoto            | Non implementata: la migrazione è un passo manuale documentato (`apps/website/docs/monorepository-setup.mdx:221-242`).                                                  |
| Apply automatico di `core`                                                            | Non implementato: il CLI genera `infra/core/<env>` ma **non** un workflow dedicato (`apps/cli/templates/environment/workflow/` contiene solo il template bootstrapper). |
| Registrazione automatica del repository su `eng-github-authorization`                 | Non implementata: resta una PR manuale (`apps/website/docs/monorepository-setup.mdx:287-298`).                                                                          |
| Controlli di coerenza post-bootstrap (ruoli, secret, gruppi effettivamente allineati) | Non implementati: la detection di "initialized" verifica solo presenza di risorse e provider (`cloud-account-service.ts:464-509`).                                      |

## Vincoli normativi

Nel repository **non sono documentati vincoli normativi o legali espliciti** (es. GDPR, PCI-DSS) specifici del processo di bootstrap. Non ne vengono quindi ipotizzati.

Esistono invece **vincoli di governance interna**, che il sistema tratta come gate di processo e che è corretto rappresentare come requisiti non funzionali:

- **Least privilege come principio dichiarato**: i ruoli operativi definitivi sono modellati come custom role composte e assegnate a scope circoscritti (`infra/modules/azure_core_infra/modules/custom_roles/custom_roles.tf`, `infra/modules/azure_github_environment_bootstrap/id_*_iam.tf`).
- **Segregazione dei compiti**: la creazione dei gruppi Entra e l'assegnazione dei ruoli a scope subscription sono riservate al repository di autorizzazione e ai suoi CODEOWNER; l'apply iniziale di `core`/`bootstrapper` richiede permessi elevati riservati all'EL (`apps/website/docs/monorepository-setup.mdx:73-79`, `:244-258`).
- **Secret handling**: le credenziali della GitHub App sono leggibili solo dagli App Administrator; il CLI le scrive come GitHub environment secret e come secret di Key Vault, mai come file nel repository (`cloud-account-service.ts:1014-1092`).
- **Auditabilità**: ogni modifica al desired state organizzativo (gruppi, Directory Readers, censimento repository, associazione GitHub App) passa da una PR revisionata; le risorse create dal CLI sono taggate `CreatedBy = "DX CLI"` (`cloud-account-service.ts:346-353`).

## Caratteristiche del sistema

- **Idempotenza parziale**: `createOrUpdate` su resource group, managed identity, federated credential e Key Vault; `addMany` con `force: true` sui template; `terraform apply` idempotente. Non idempotenti in senso stretto sono i passaggi git/PR di `dx init` e le PR verso i repository di autorizzazione, che però hanno logica di no-op (`azure-authorization.ts:281-287`).
- **Branching condizionale**: l'intero flusso di `add environment` si biforca sullo stato `initialized` calcolato per ogni subscription. Solo il ramo non inizializzato produce `infra/core/<env>`, gli import block e la PR di autorizzazione Azure.
- **Naming deterministico**: tutti i nomi derivano da `prefix`, `env_short` (`d`/`u`/`p`), `location_short`, dominio e instance number. Esempi: `<prefix>-<env>-<loc>-common-rg-01`, `<prefix>-<env>-<loc>-bootstrap-id-01`, `<prefix><env><loc>tfstatest01`, chiave di state `<prefix>/<domain>/<scope>.tfstate` (`cloud-account-service.ts:344`, `:366-367`, `:562`; `apps/cli/src/adapters/plop/helpers/terraform-state-key.ts:29-42`).
- **Environment tenant-qualified**: il CLI accetta `dev`/`uat`/`prod` oppure `<tenant>-<lifecycle>` (es. `ced-prod`), mappando comunque sullo short code del lifecycle (`apps/cli/src/domain/environment.ts:9-70`).
- **Rollback parziale**: se l'inizializzazione di una subscription fallisce, il CLI elimina il bootstrap common RG creato/usato dal flusso; se fallisce la creazione del container di state, elimina il relativo RG (`cloud-account-service.ts:451-461`, `:595-606`).
- **Dipendenze esterne bloccanti**: GitHub App esistente e credenziali disponibili, gruppi Entra esistenti, merge delle PR nei repository di autorizzazione, apply iniziali privilegiati.
- **Solo Azure**: `add environment` supporta unicamente il CSP `azure` (`apps/cli/src/domain/cloud-account.ts`), anche se esistono moduli Terraform AWS nel repository.

## Service Level Objective

**TBD**

Non esistono SLO definiti per il processo di bootstrap nel repository né nella documentazione pubblica. Questa sezione è volutamente lasciata a `TBD` e non propone target: qualunque soglia indicata qui sarebbe un'invenzione non supportata da evidenze.

## Make or buy

| Componente                                                                                                                                                   | Scelta                                                         | Motivazione osservabile                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DX CLI (`apps/cli`)                                                                                                                                          | **Build**                                                      | Nessun tool di mercato copre la sequenza PagoPA-specifica: discovery subscription, gruppi Entra di prodotto, repository di autorizzazione, GitHub App per runner. |
| Moduli Terraform `azure-core-infra`, `azure-github-environment-bootstrap`, `github-environment-bootstrap`, `azure-merge-roles`, runner su Container App Jobs | **Build** (pubblicati su Terraform Registry sotto `pagopa-dx`) | Incapsulano convenzioni interne di naming, ruoli e topologia; il versioning permette rollout controllati.                                                         |
| Action e workflow riusabili (`actions/`, `.github/workflows/release-terraform-bootstrapper-v1.yaml`)                                                         | **Build**                                                      | Standardizzano login OIDC, setup Terraform, plan sanitizzato e commenti su PR.                                                                                    |
| Terraform, provider `azurerm`/`azuread`/`github`, provider custom `pagopa-dx/azure`                                                                          | **Buy/adopt** (il provider `dx` è build interno)               | Terraform è lo standard IaC adottato; il provider custom espone solo le funzioni di naming.                                                                       |
| GitHub Actions, GitHub Environments/Secrets, GitHub App, OIDC                                                                                                | **Buy/adopt**                                                  | Piattaforma CI/CD già in uso a livello organizzativo.                                                                                                             |
| Azure (ARM, Entra ID, Key Vault, Storage, Container Apps, Log Analytics)                                                                                     | **Buy/adopt**                                                  | Cloud target.                                                                                                                                                     |
| Nx + pnpm come orchestratori di monorepo                                                                                                                     | **Buy/adopt**                                                  | Scelta esplicita rispetto a un orchestratore proprietario; lo scaffolding genera `nx.json` e `pnpm-workspace.yaml` (`apps/cli/templates/monorepo/`).              |
| Librerie OSS del CLI (`commander`, `inquirer`, `node-plop`, `zod`, `neverthrow`, SDK Azure, `octokit`)                                                       | **Buy/adopt**                                                  | Componenti generici, nessun valore differenziante nel riscriverli.                                                                                                |

## Design di alto livello

Il sistema di bootstrap è composto da quattro piani distinti:

1. **Piano di orchestrazione locale** — il DX CLI, che raccoglie input, interroga Azure e GitHub, decide il ramo di esecuzione e produce sia risorse cloud sia file.
2. **Piano di provisioning diretto** — le chiamate SDK/API che creano ciò che serve _prima_ che Terraform possa girare: provider registrati, bootstrap RG, identity CD/CI, OIDC, secret, Key Vault, backend di state.
3. **Piano dichiarativo Terraform** — tre configurazioni con cicli di vita separati: `infra/repository` (GitHub), `infra/core/<env>` (baseline Azure condivisa), `infra/bootstrapper/<env>` (identità operative, RBAC, runner, secret).
4. **Piano di desired state organizzativo** — i repository `eng-azure-authorization` ed `eng-github-authorization`, che restano la fonte di verità per gruppi Entra, ruoli a scope subscription, Directory Readers, censimento repository e associazione della GitHub App.

### Flusso AS-IS end-to-end

```mermaid
flowchart TD
  P0["Prerequisiti: subscription, environment, prefix, dominio, tag, owner"] --> P1{"GitHub App del prodotto esiste?"}
  P1 -->|No| P2["PR a eng-github-authorization e creazione App da parte degli App Admin"]
  P1 -->|Si| P3["Recupero App ID, Client ID, Installation ID, private key"]
  P2 --> P3
  P3 --> P4["Gruppi Entra e membership predisposti tramite eng-azure-authorization"]

  P4 --> I1["dx init: precondition Terraform e Corepack, autenticazione GitHub"]
  I1 --> I2["Scaffolding workspace e infra/repository"]
  I2 --> I3{"Pubblicare su GitHub?"}
  I3 -->|No| I4["Solo artefatti locali e istruzioni manuali"]
  I3 -->|Si| I5["terraform init e apply su infra/repository, creazione repository"]
  I5 --> I6["git init, branch features/scaffold-workspace, push, PR Scaffold repository"]

  I6 --> A1["dx add environment: precondition Terraform, az login, Corepack"]
  A1 --> A2["Discovery subscription abilitate e prompt input"]
  A2 --> A3{"Environment gia inizializzato?"}

  A3 -->|Si| S1["getTerraformBackend"]
  A3 -->|No| C1["Conferma effetti e verifica permessi del principal umano"]
  C1 --> C2["initCloudAccounts: provider, bootstrap RG, identity CD e CI, ruoli, OIDC, secret, Key Vault"]
  C2 --> C3{"Backend Terraform presente?"}
  C3 -->|No| C4["provisionTerraformBackend: RG, Storage Account, container terraform-state"]
  C3 -->|Si| S1
  C4 --> S1

  S1 --> S2["syncRepositoryEnvironments: patch di infra/repository/main.tf e apply automatico"]
  S2 --> S3["configureGitHubEnvironments: OIDC e secret bootstrapper repository-specific"]
  S3 --> S4["Generazione workflow bootstrapper e infra/bootstrapper/env"]
  S4 --> S5{"Ramo di inizializzazione?"}
  S5 -->|Si| S6["Generazione infra/core/env e import block"]
  S5 -->|No| S7["Nessun core generato"]
  S6 --> Z1["PR best-effort su eng-azure-authorization"]
  S7 --> Z3

  Z1 --> Z1b["Review CODEOWNER, plan su PR, apply su main"]
  Z1b --> Z2["Apply iniziale di core da parte dell EL"]
  Z2 --> Z3["Apply iniziale di bootstrapper da parte dell EL o del workflow"]
  Z3 --> Z4["PR manuale su eng-github-authorization: censimento repository e associazione GitHub App"]
  Z4 --> Z5["Stato finale operativo: workflow bootstrapper autonomi"]
```

> **Nota evolutiva Nx (stato futuro, non implementato)**
> Quando tutti i team saranno migrati ai workflow Nx, l'ordine cambia: la **registrazione GitHub esterna** (oggi ultimo passo, `Z4`) verrà eseguita **prima** degli apply, così che i workflow Nx possano applicare automaticamente sia `core` sia `bootstrapper`, eliminando gli apply manuali dell'EL (`Z2` e `Z3`). Nel flusso attuale l'ordine è invece: apply `core` → apply `bootstrapper` → registrazione GitHub.

```mermaid
flowchart LR
  subgraph ASIS["AS-IS"]
    A1["dx add environment"] --> A2["Apply core - EL"]
    A2 --> A3["Apply bootstrapper - EL o workflow"]
    A3 --> A4["Registrazione su eng-github-authorization"]
  end

  subgraph TOBE["TO-BE con Nx - non implementato"]
    B1["dx add environment"] --> B2["Registrazione su eng-github-authorization"]
    B2 --> B3["Workflow Nx applica core"]
    B3 --> B4["Workflow Nx applica bootstrapper"]
  end
```

## Servizi cloud

| Piattaforma | Servizio                                                                           | Uso nel bootstrap                                                                                                                                                             | Creato da                                             |
| ----------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Azure       | Resource Group                                                                     | `<prefix>-<env>-<loc>-common-rg-01` (bootstrap), `<prefix>-<env>-<loc>-tfstate-rg-01`, `common`/`network`/`github-runner`/`opex` di `core`, RG applicativo del `bootstrapper` | CLI + `core` + `bootstrapper`                         |
| Azure       | Managed Identity (user-assigned)                                                   | bootstrap CD/CI; app/infra/opex CD/CI                                                                                                                                         | CLI + `bootstrapper`                                  |
| Azure       | Federated Identity Credential                                                      | trust OIDC con i GitHub environment                                                                                                                                           | CLI + `bootstrapper`                                  |
| Azure       | Key Vault                                                                          | `<prefix>-<env>-<loc>-common-kv-01` con i secret della GitHub Runner App; Key Vault di `core` (RBAC, private endpoint)                                                        | CLI (poi importato da `core`)                         |
| Azure       | Storage Account + Blob container `terraform-state`                                 | backend remoto di `core` e `bootstrapper`                                                                                                                                     | CLI                                                   |
| Azure       | Virtual Network, subnet, Private DNS Zone, NAT Gateway, VPN Gateway, DNS forwarder | rete privata e risoluzione nomi                                                                                                                                               | `core`                                                |
| Azure       | Log Analytics Workspace, Application Insights                                      | osservabilità di base                                                                                                                                                         | `core`                                                |
| Azure       | Container App Environment + Container App Job                                      | self-hosted GitHub runner                                                                                                                                                     | `core` (ambiente) + `bootstrapper` (job)              |
| Azure       | Custom role definition a scope subscription                                        | bundle di ruoli DX App/Infra CI/CD                                                                                                                                            | `core` (`modules/custom_roles`)                       |
| Entra ID    | Gruppi, membership, Directory Readers                                              | governance degli accessi umani e lookup directory delle identity                                                                                                              | `eng-azure-authorization`                             |
| GitHub      | Repository, branch protection, autolink, workflow permission                       | governance del monorepo                                                                                                                                                       | modulo `github-environment-bootstrap`                 |
| GitHub      | Environment e Actions secret                                                       | trust OIDC e configurazione dei workflow                                                                                                                                      | CLI + `github-environment-bootstrap` + `bootstrapper` |
| GitHub      | GitHub App                                                                         | autenticazione del runner self-hosted                                                                                                                                         | App Admin (manuale)                                   |
| GitHub      | Actions (OIDC)                                                                     | esecuzione di plan/apply                                                                                                                                                      | Piattaforma                                           |

## Vista statica delle componenti

### Diagramma delle dipendenze

```mermaid
flowchart LR
  CLI["DX CLI"] --> REPOTF["infra/repository - modulo github-environment-bootstrap"]
  CLI --> BOOTRES["Risorse di bootstrap create via SDK: RG, identity CD e CI, OIDC, secret, Key Vault"]
  CLI --> BACKEND["Backend Terraform: RG, Storage Account, container terraform-state"]

  BACKEND --> CORETF["infra/core/env - modulo azure-core-infra"]
  BOOTRES --> CORETF
  CORETF --> CORESTATE["State remoto core.tfstate"]
  CORESTATE --> EXPORTER["modulo azure-core-values-exporter"]
  EXPORTER --> BOOTTF["infra/bootstrapper/env - modulo azure-github-environment-bootstrap"]
  BACKEND --> BOOTTF
  REPOTF --> GHENV["GitHub environment infra, app, opex, automation, bootstrapper"]
  GHENV --> BOOTTF
  BOOTTF --> RUNNER["Container App Job runner"]
  BOOTTF --> IDS["Identity definitive app, infra, opex"]
  CORETF --> ROLES["Custom role DX a scope subscription"]
  ROLES --> BOOTTF
```

Punti chiave della catena di dipendenze:

- `bootstrapper` **non** legge lo state di `core` direttamente: usa il modulo `pagopa-dx/azure-core-values-exporter`, che accede al blob `<prefix>/<domain>/core.tfstate` sullo stesso Storage Account (`apps/cli/templates/environment/bootstrapper/{{env.name}}/main.tf.hbs`).
- `bootstrapper` legge le **custom role** con `data "azurerm_role_definition"` a scope subscription: se `core` non è stato applicato, quei data source falliscono (`infra/modules/azure_github_environment_bootstrap/data.tf`). Questo è il motivo tecnico per cui, nel flusso iniziale attuale, **`core` va applicato prima di `bootstrapper`**.
- `bootstrapper` legge i gruppi Entra con `data "azuread_group"`: se i gruppi non esistono o hanno nomi diversi, l'apply fallisce (`apps/cli/templates/environment/bootstrapper/{{env.name}}/data.tf.hbs`).

### Diagramma delle componenti

```mermaid
flowchart TB
  subgraph CLIAPP["apps/cli"]
    CMD["adapters/commander: init, add environment"]
    PROMPTS["plop/generators/environment/prompts.ts"]
    ACTIONS["plop/generators/environment/actions.ts"]
    PACTS["plop/actions: initCloudAccounts, provisionTerraformBackend, getTerraformBackend, syncRepositoryEnvironments, configureGitHubEnvironments"]
    DOMAIN["domain: environment, cloud-account, authorization, remote-backend"]
    AZ["adapters/azure: AzureCloudAccountService, AzureSubscriptionRepository"]
    GH["adapters/octokit e github"]
    PAGOPA["adapters/pagopa-technology: azure-authorization"]
    TPL["templates: monorepo, environment"]
  end

  subgraph MODULI["infra/modules"]
    MREPO["github_environment_bootstrap"]
    MCORE["azure_core_infra"]
    MBOOT["azure_github_environment_bootstrap"]
    MRUNNER["github_selfhosted_runner_on_container_app_jobs"]
    MROLES["azure_merge_roles"]
  end

  subgraph ESTERNI["Sistemi esterni"]
    ARM["Azure ARM e Graph"]
    GHAPI["GitHub API"]
    AUTHAZ["eng-azure-authorization"]
    AUTHGH["eng-github-authorization"]
  end

  CMD --> PROMPTS
  CMD --> PAGOPA
  PROMPTS --> DOMAIN
  PROMPTS --> AZ
  ACTIONS --> PACTS
  PACTS --> AZ
  PACTS --> GH
  PACTS --> TPL
  AZ --> ARM
  GH --> GHAPI
  PAGOPA --> GHAPI
  PAGOPA --> AUTHAZ
  TPL --> MREPO
  TPL --> MCORE
  TPL --> MBOOT
  MCORE --> MROLES
  MBOOT --> MRUNNER
  AUTHGH --> GHAPI
```

### Diagramma dell'architettura

```mermaid
flowchart TB
  subgraph LOCALE["Postazione dell'engineer"]
    FS["Filesystem del monorepo"]
    TFLOCAL["State locale di infra/repository"]
    AZCLI["Credenziale Azure CLI"]
    GHCRED["Credenziale GitHub"]
  end

  subgraph GITHUBP["GitHub"]
    REPO["Repository monorepo"]
    BRANCH["Branch features/scaffold-workspace e PR"]
    ENVCICD["Environment bootstrapper, infra, app, opex, automation"]
    SEC["Environment e repository secret"]
    WF["Workflow bootstrapper generato"]
  end

  subgraph AZUREP["Azure subscription"]
    RGBOOT["Bootstrap common RG"]
    IDBOOT["Identity bootstrap CD e CI"]
    KV["Common Key Vault"]
    TFST["Storage Account terraform-state"]
    CORERES["Baseline core: rete, DNS, Key Vault, monitoring, runner env, custom role"]
    BOOTRES["Bootstrapper: RG applicativo, identity app, infra, opex, runner job"]
  end

  subgraph GOV["Desired state organizzativo"]
    AZAUTH["eng-azure-authorization"]
    GHAUTH["eng-github-authorization"]
  end

  FS --> REPO
  FS --> TFLOCAL
  AZCLI --> RGBOOT
  AZCLI --> IDBOOT
  AZCLI --> KV
  AZCLI --> TFST
  GHCRED --> REPO
  GHCRED --> SEC
  GHCRED --> AZAUTH
  TFLOCAL --> ENVCICD
  IDBOOT --> ENVCICD
  ENVCICD --> WF
  WF --> BOOTRES
  CORERES --> BOOTRES
  TFST --> CORERES
  TFST --> BOOTRES
  AZAUTH --> IDBOOT
  GHAUTH --> REPO
```

## Vista dinamica delle componenti

### Sequenza di `dx init`

```mermaid
sequenceDiagram
  autonumber
  participant ENG as Engineer
  participant CLI as DX CLI
  participant FS as Filesystem
  participant TF as Terraform infra/repository
  participant GH as GitHub API

  ENG->>CLI: dx init
  CLI->>CLI: verifica Terraform e Corepack
  CLI->>GH: risoluzione credenziale GitHub
  CLI->>ENG: prompt nome, owner, descrizione
  CLI->>GH: verifica che il repository non esista
  GH-->>CLI: RepositoryNotFound
  CLI->>FS: scaffolding workspace, dotfile, infra/repository, settings Copilot
  CLI->>ENG: confermi la pubblicazione su GitHub?
  alt Pubblicazione confermata
    CLI->>TF: terraform init
    CLI->>TF: terraform apply -auto-approve
    TF->>GH: creazione repository, branch main, policy, environment di default
    CLI->>FS: git init e remote origin
    CLI->>GH: fetch origin main, branch features/scaffold-workspace, push
    CLI->>GH: creazione PR "Scaffold repository"
    GH-->>CLI: URL della PR oppure errore non bloccante
  else Pubblicazione rifiutata
    CLI-->>ENG: soli artefatti locali e istruzioni manuali
  end
  CLI-->>ENG: riepilogo e next step
```

### Sequenza di `dx add environment`

```mermaid
sequenceDiagram
  autonumber
  participant ENG as Engineer o EL
  participant CLI as DX CLI
  participant ARM as Azure ARM e Resource Graph
  participant GRAPH as Microsoft Graph
  participant GH as GitHub API
  participant TF as Terraform infra/repository
  participant AUTH as eng-azure-authorization

  ENG->>CLI: dx add environment
  CLI->>CLI: verifica Terraform, az login, Corepack
  CLI->>ARM: elenco subscription abilitate
  CLI->>ENG: prompt environment, account, prefix, dominio, tag, location
  CLI->>ARM: query identity bootstrap, Key Vault comune, provider registrati
  CLI->>ARM: query Storage Account di state con naming atteso
  alt Environment gia inizializzato
    CLI->>CLI: salta l'inizializzazione
  else Environment non inizializzato
    CLI-->>ENG: elenco degli effetti e richiesta di conferma
    CLI->>GRAPH: lettura utente corrente e gruppi transitivi
    CLI->>ARM: verifica Owner, Storage Blob Data Contributor, Key Vault Secrets Officer su ogni subscription
    CLI->>ENG: prompt credenziali GitHub Runner App
    CLI->>ARM: registrazione resource provider
    CLI->>ARM: creazione bootstrap common RG e identity CD e CI
    CLI->>ARM: role assignment a scope subscription per CD e CI
    CLI->>ARM: creazione federated credential per bootstrapper-env-cd e -ci
    CLI->>GH: scrittura secret ARM negli environment, credenziali App nel solo CD
    CLI->>ARM: creazione common Key Vault e secret della Runner App
    opt Backend assente
      CLI->>ARM: creazione RG, Storage Account e container terraform-state
    end
  end
  CLI->>TF: patch di main.tf con l'environment e apply -auto-approve
  TF->>GH: creazione o aggiornamento degli environment del repository
  CLI->>ARM: riconfigurazione OIDC e secret bootstrapper repository-specific
  CLI->>ENG: generazione workflow bootstrapper e infra/bootstrapper/env
  opt Ramo di inizializzazione
    CLI->>ENG: generazione infra/core/env e import block
    CLI->>AUTH: PR best-effort con Directory Readers e gruppi standard
    AUTH-->>ENG: URL della PR da far revisionare
  end
  CLI-->>ENG: riepilogo e next step
```

### Sequenza degli apply iniziali e della transizione alle identity definitive

```mermaid
sequenceDiagram
  autonumber
  participant EL as Engineering Leader
  participant CORE as Terraform core
  participant BOOT as Terraform bootstrapper
  participant ARM as Azure
  participant GH as GitHub
  participant WF as Workflow bootstrapper

  EL->>CORE: terraform init e apply su infra/core/env
  CORE->>ARM: import del common RG e del common Key Vault creati dal CLI
  CORE->>ARM: creazione rete, DNS, VPN, Key Vault, monitoring, ambiente runner
  CORE->>ARM: creazione delle custom role DX a scope subscription
  EL->>BOOT: terraform init e apply su infra/bootstrapper/env
  BOOT->>ARM: lettura delle custom role e dei gruppi Entra
  BOOT->>ARM: creazione RG applicativo e identity app, infra, opex CI e CD
  BOOT->>ARM: creazione federated credential per gli environment definitivi
  BOOT->>ARM: role assignment su RG, Storage Account di state, RG di rete e Opex
  BOOT->>GH: scrittura dei secret negli environment definitivi
  BOOT->>ARM: creazione del Container App Job del runner
  Note over WF: dagli apply successivi il workflow generato usa l'environment bootstrapper-env-cd
  WF->>BOOT: terraform apply -auto-approve in CI
```

## Data layer

Non esiste un database applicativo. Il "data layer" del bootstrap è distribuito su quattro depositi con owner e cicli di vita diversi.

```mermaid
flowchart TB
  subgraph LOC["Stato locale"]
    L1["Working tree del monorepo"]
    L2["infra/repository/terraform.tfstate locale"]
    L3["Branch features/scaffold-workspace"]
  end

  subgraph REM["Stato Terraform remoto"]
    R1["Storage Account prefix-env-loc-tfstatest01"]
    R2["Container terraform-state"]
    R3["Blob prefix/domain/core.tfstate"]
    R4["Blob prefix/domain/bootstrapper.tfstate"]
  end

  subgraph SEC["Secret e configurazione"]
    S1["GitHub environment secret: ARM_CLIENT_ID, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID"]
    S2["GitHub environment secret CD: GH_APP_ID, GH_APP_CLIENT_ID, GH_APP_INSTALLATION_ID, GH_APP_KEY"]
    S3["GitHub repository secret: ARM_TENANT_ID"]
    S4["Key Vault comune: github-runner-app-id, github-runner-app-installation-id, github-runner-app-key"]
  end

  subgraph GOVD["Desired state organizzativo"]
    G1["eng-azure-authorization: terraform.tfvars.json per subscription"]
    G2["eng-github-authorization: censimento repository e apps.json"]
  end

  subgraph AUTO["Writer automatici"]
    W1["DX CLI"]
    W2["Modulo bootstrapper"]
  end

  subgraph APPL["Stato organizzativo applicato"]
    A1["Entra ID: gruppi, ruoli e Directory Readers"]
    A2["GitHub organization: repository, team e installazione App"]
  end

  L1 --> L3
  L2 -->|migrazione manuale| R2
  R1 --> R2
  R2 --> R3
  R2 --> R4
  R3 --> R4
  S4 --> S2
  W1 --> S1
  W1 --> S2
  W1 --> S4
  W2 --> S1
  W2 --> S3
  G1 --> A1
  G2 --> A2
```

| Deposito                                      | Contenuto                                                      | Owner                       | Note                                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Working tree locale                           | Workspace generato, configurazioni Terraform, workflow         | Engineer                    | Diventa condiviso solo con il push e il merge della PR.                                                                                                            |
| State locale `infra/repository`               | Repository GitHub, environment, policy                         | Engineer                    | Nasce locale (`init.ts:338-351`) e viene ri-applicato ad ogni `add environment` (`sync-repository-environments.ts:157-159`). Migrazione al backend remoto manuale. |
| Blob `<prefix>/<domain>/core.tfstate`         | Baseline Azure                                                 | Team + EL                   | Chiave generata da `terraformStateKey` (`terraform-state-key.ts:29-42`). Letto anche dal `core-values-exporter`.                                                   |
| Blob `<prefix>/<domain>/bootstrapper.tfstate` | Identity definitive, RBAC, runner, secret                      | Team + workflow CD          | Il lock è gestito dal blob storage.                                                                                                                                |
| GitHub environment secret                     | Client ID e subscription per OIDC, credenziali App nel solo CD | CLI e modulo `bootstrapper` | Il CLI scrive gli environment `bootstrapper-<name>-ci/cd`; il modulo scrive `infra/app/opex-<lifecycle>-ci/cd` e `automation-<lifecycle>-cd` (solo CD).            |
| Key Vault comune                              | Secret della GitHub Runner App                                 | CLI, poi `core` (import)    | Consumati dal Container App Job del runner.                                                                                                                        |
| `eng-azure-authorization`                     | Gruppi, ruoli a scope subscription, Directory Readers          | CODEOWNER del repository    | Applicato dalla pipeline dopo merge su `main`.                                                                                                                     |
| `eng-github-authorization`                    | Censimento repository, team/collaborator, `apps.json`          | CODEOWNER e App Admin       | Abilita l'installazione della GitHub App sul repository.                                                                                                           |

## Inventario degli artefatti

### Generati da `dx init` (file)

| Artefatto                                                                                                                                   | Percorso template                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Workspace Nx + pnpm (`nx.json`, `pnpm-workspace.yaml`, `package.json`)                                                                      | `apps/cli/templates/monorepo/`                                                 |
| Version pin (`.node-version`, `.terraform-version`)                                                                                         | `apps/cli/templates/monorepo/.node-version.hbs`, `.terraform-version.hbs`      |
| Dotfile di qualità e sicurezza (`.pre-commit-config.yaml`, `.tflint.hcl`, `.trivyignore`, `.editorconfig`, `.prettierignore`, `.gitignore`) | `apps/cli/templates/monorepo/`                                                 |
| README                                                                                                                                      | `apps/cli/templates/monorepo/README.md.hbs`                                    |
| Configurazione Terraform del repository GitHub                                                                                              | `apps/cli/templates/monorepo/infra/repository/{main,outputs,providers}.tf.hbs` |
| Configurazione marketplace/plugin Copilot                                                                                                   | `apps/cli/templates/monorepo/.github/copilot/settings.json`                    |

### Generati da `dx add environment` (file)

| Artefatto                                                               | Condizione                    | Percorso template                                                           |
| ----------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `infra/bootstrapper/<env>/{data,main,providers}.tf`                     | Sempre                        | `apps/cli/templates/environment/bootstrapper/{{env.name}}/`                 |
| `infra/bootstrapper/<env>/{backend,locals}.tf`                          | Sempre                        | `apps/cli/templates/environment/shared/`                                    |
| `.github/workflows/_release-terraform-apply-bootstrapper-<env>.yaml`    | Sempre                        | `apps/cli/templates/environment/workflow/`                                  |
| `infra/core/<env>/{main,outputs,providers}.tf`                          | Solo ramo di inizializzazione | `apps/cli/templates/environment/core/{{env.name}}/`                         |
| `infra/core/<env>/imports.tf` con import block di common RG e Key Vault | Solo ramo di inizializzazione | `apps/cli/templates/environment/core/{{env.name}}/imports.tf.hbs`           |
| Modifica in-place di `infra/repository/main.tf` (lista `environments`)  | Sempre                        | `apps/cli/src/adapters/plop/actions/sync-repository-environments.ts:93-138` |

### Creati direttamente dal CLI via API/SDK

| Artefatto                                                                       | Evidenza                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------ |
| Repository GitHub, branch iniziale e PR di scaffolding (via Terraform e API)    | `init.ts:317-513`                                |
| Registrazione dei 16 resource provider richiesti                                | `cloud-account-service.ts:114-131`, `:970-993`   |
| Bootstrap common RG `<prefix>-<env>-<loc>-common-rg-01`                         | `cloud-account-service.ts:344-358`               |
| Managed identity `…-bootstrap-id-01` (CD) e `…-bootstrap-ci-id-01` (CI)         | `cloud-account-service.ts:366-389`               |
| Role assignment a scope subscription per le identity di bootstrap               | `cloud-account-service.ts:403-418`, `:630-670`   |
| Federated credential OIDC per `bootstrapper-<env>-cd` e `-ci`                   | `cloud-account-service.ts:718-734`               |
| Secret negli environment GitHub `bootstrapper-<env>-ci/cd`                      | `cloud-account-service.ts:1014-1047`             |
| Common Key Vault e secret della Runner App                                      | `cloud-account-service.ts:795-859`, `:1055-1092` |
| Backend Terraform: RG, Storage Account, container `terraform-state`             | `cloud-account-service.ts:511-614`               |
| Apply automatico di `infra/repository` per creare/sincronizzare gli environment | `sync-repository-environments.ts:157-159`        |
| PR su `eng-azure-authorization`                                                 | `azure-authorization.ts:217-357`                 |

### Non generati / manuali o esterni

| Passaggio                                                                                 | Owner                            |
| ----------------------------------------------------------------------------------------- | -------------------------------- |
| Creazione della GitHub App e recupero delle credenziali                                   | App Admin / `engineering-cloud`  |
| Creazione dei gruppi Entra e delle membership umane                                       | Team di autorizzazione Azure     |
| Review, approvazione e merge delle PR nei repository di autorizzazione                    | CODEOWNER                        |
| Apply iniziale di `infra/core/<env>` (nessun workflow generato)                           | EL                               |
| Apply iniziale di `infra/bootstrapper/<env>`                                              | EL (poi workflow)                |
| Migrazione dello state di `infra/repository` al backend remoto                            | Engineer                         |
| Registrazione del repository e associazione alla GitHub App su `eng-github-authorization` | Product team + App Admin         |
| Implementazione dei plugin Copilot abilitati dallo scaffolding                            | DX Team (repository `pagopa/dx`) |
| Codice applicativo e infrastruttura di prodotto (`infra/resources`)                       | Product team                     |

> **Nota su `.github/copilot/settings.json`**: il file **viene** scaffoldato da `dx init` (`apps/cli/templates/monorepo/.github/copilot/settings.json`), contrariamente all'aspettativa iniziale che il bootstrap non toccasse la configurazione Copilot. Il file dichiara il marketplace `pagopa-dx` puntando al repository `pagopa/dx` e abilita plugin (`terraform`, `azure`, `project-management`, `standards`, `tests`, `typescript`) le cui **implementazioni vivono fuori dal repository generato**. Vedi il capitolo dei gap per la discrepanza rilevata sull'elenco dei plugin dichiarati.

## Matrice RBAC

Legenda scope: `SUB` = subscription, `RG` = resource group, `RES` = risorsa singola, `DIR` = directory Entra.

### Livello 1 — Permessi richiesti al principal umano

| Grantor                               | Meccanismo                                                       | Principal                              | Ruolo                           | Scope                                     | Momento                                | Owner della modifica                              | Evidenza                                       |
| ------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- | ------------------------------- | ----------------------------------------- | -------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Amministrazione Azure (fuori dal CLI) | Assegnazione preesistente, diretta o via gruppo Entra transitivo | Utente che esegue `dx add environment` | `Owner`                         | `SUB` (tutte le subscription selezionate) | Verificato prima dell'inizializzazione | `eng-azure-authorization` / amministrazione Azure | `cloud-account-service.ts:257-261`, `:268-299` |
| Idem                                  | Idem                                                             | Idem                                   | `Storage Blob Data Contributor` | `SUB`                                     | Idem                                   | Idem                                              | `cloud-account-service.ts:257-261`             |
| Idem                                  | Idem                                                             | Idem                                   | `Key Vault Secrets Officer`     | `SUB`                                     | Idem                                   | Idem                                              | `cloud-account-service.ts:257-261`             |

Il controllo raccoglie l'object id dell'utente e **tutti i gruppi transitivi** via Microsoft Graph (`/me`, `/me/transitiveMemberOf`) e considera soddisfatto il requisito se i tre ruoli risultano assegnati a uno qualsiasi di quei principal; in caso di 403 il risultato è `false` (`cloud-account-service.ts:300-312`). Il check è eseguito su **ogni** subscription selezionata (`apps/cli/src/domain/environment.ts:147-159`).

### Livello 2 — Grant assegnati direttamente dal CLI alle identity di bootstrap

| Grantor                    | Meccanismo                                             | Principal                   | Ruolo                                                                               | Scope            | Momento                                                  | Owner  | Evidenza                                     |
| -------------------------- | ------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------- | ------ | -------------------------------------------- |
| Principal locale Azure CLI | `AuthorizationManagementClient.roleAssignments.create` | `…-bootstrap-id-01` (CD)    | `Role Based Access Control Administrator`                                           | `SUB`            | `initCloudAccounts`                                      | DX CLI | `cloud-account-service.ts:75-80`, `:403-410` |
| Principal locale Azure CLI | Idem                                                   | `…-bootstrap-id-01` (CD)    | `Contributor`                                                                       | `SUB`            | Idem                                                     | DX CLI | `cloud-account-service.ts:75-80`             |
| Principal locale Azure CLI | Idem                                                   | `…-bootstrap-id-01` (CD)    | `Storage Blob Data Contributor`                                                     | `SUB`            | Idem                                                     | DX CLI | `cloud-account-service.ts:75-80`             |
| Principal locale Azure CLI | Idem                                                   | `…-bootstrap-ci-id-01` (CI) | `Reader`                                                                            | `SUB`            | Idem                                                     | DX CLI | `cloud-account-service.ts:82-86`, `:411-417` |
| Principal locale Azure CLI | Idem                                                   | `…-bootstrap-ci-id-01` (CI) | `Storage Blob Data Contributor`                                                     | `SUB`            | Idem                                                     | DX CLI | `cloud-account-service.ts:82-86`             |
| Principal locale Azure CLI | `federatedIdentityCredentials.createOrUpdate`          | CD e CI di bootstrap        | Trust OIDC, subject `repo:<owner>/<repo>:environment:bootstrapper-<env>-cd` / `-ci` | `RES` (identity) | `initCloudAccounts` e ogni `configureGitHubEnvironments` | DX CLI | `cloud-account-service.ts:700-734`           |

Nota: il nome del federated credential include un suffisso derivato dal repository, così repository diversi possono condividere la stessa identity senza sovrascriversi (`cloud-account-service.ts:716-717`, `:861-871`).

### Livello 3 — Grant assegnati tramite `eng-azure-authorization`

| Grantor                               | Meccanismo                                  | Principal                                     | Ruolo                                                                                                                                                       | Scope | Momento                | Owner                                      | Evidenza                                           |
| ------------------------------------- | ------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------- | ------------------------------------------ | -------------------------------------------------- |
| Pipeline di `eng-azure-authorization` | PR aperta dal CLI + merge su `main` + apply | `…-bootstrap-id-01` (CD)                      | Appartenenza a **Directory Readers**                                                                                                                        | `DIR` | Dopo il merge della PR | CODEOWNER del repository di autorizzazione | `azure-authorization.ts:186-212`, `add.ts:281-288` |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `<prefix>-<envShort>-adgroup-admin`    | `Owner`                                                                                                                                                     | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:14`                 |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-developers`                 | `Owner`                                                                                                                                                     | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:15`                 |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-externals`                  | `Owner`                                                                                                                                                     | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:36`                 |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-operations`                 | `Reader`, `Monitoring Contributor`, `Support Request Contributor`, `Storage Blob Data Reader`, `Storage Queue Data Reader`, `Cosmos DB Account Reader Role` | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:16-26`              |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-security`                   | `Reader`, `Support Request Contributor`                                                                                                                     | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:27`                 |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-technical-project-managers` | `Reader`, `Monitoring Contributor`, `Support Request Contributor`                                                                                           | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:28-31`              |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-product-owners`             | `Reader`, `Support Request Contributor`                                                                                                                     | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:32-35`              |
| Pipeline di `eng-azure-authorization` | Idem                                        | Gruppo `…-adgroup-oncall`                     | `Reader`, `Monitoring Contributor`, `Support Request Contributor`, `Storage Blob Data Reader`, `Storage Queue Data Reader`, `Cosmos DB Account Reader Role` | `SUB` | Idem                   | CODEOWNER                                  | `azure-authorization-config.ts:37-47`              |

Il CLI **preserva** i membri esistenti e i gruppi custom, aggiornando solo i ruoli dei gruppi standard e aggiungendo quelli mancanti con lista membri vuota (`azure-authorization.ts:70-119`).

### Livello 4a — Custom role create da `core` (definizione, non assegnazione)

| Grantor                              | Meccanismo                           | Custom role                                                           | Ruoli sorgente uniti                                                                                                                                                                               | Scope di definizione | Evidenza                                                              |
| ------------------------------------ | ------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------- |
| `core` (identity che esegue l'apply) | modulo `pagopa-dx/azure-merge-roles` | `<sub> DX App CD Resource Groups`                                     | Website Contributor, CDN Profile Contributor, Container Apps Contributor, Storage Blob Data Contributor, PagoPA Static Web Apps List Secrets                                                       | `SUB`                | `infra/modules/azure_core_infra/modules/custom_roles/custom_roles.tf` |
| `core`                               | Idem                                 | `<sub> DX App CI Resource Groups`                                     | PagoPA IaC Reader, PagoPA Static Web Apps List Secrets                                                                                                                                             | `SUB`                | Idem                                                                  |
| `core`                               | Idem                                 | `<sub> DX Infra CD Private Networking`                                | Private DNS Zone Contributor, Network Contributor                                                                                                                                                  | `SUB`                | Idem                                                                  |
| `core`                               | Idem                                 | `<sub> DX Infra CD Resource Groups`                                   | Contributor, User Access Administrator, Key Vault Secrets/Certificates/Crypto Officer, Storage Blob/Queue/Table Data Contributor, Container Apps Contributor                                       | `SUB`                | Idem                                                                  |
| `core`                               | Idem                                 | `<sub> DX Infra CD Subscription`                                      | Reader, Role Based Access Control Administrator, Log Analytics Contributor, Azure Service Bus Data Owner, API Management Service Contributor + action aggiuntive su NAT Gateway e Private Endpoint | `SUB`                | Idem                                                                  |
| `core`                               | Idem                                 | `<sub> DX Infra CI Subscription`, `<sub> DX Infra CI Resource Groups` | Bundle di sola lettura per il piano CI                                                                                                                                                             | `SUB`                | Idem                                                                  |

Le custom role sono **definite** da `core` e **assegnate** da `bootstrapper`, che le risolve con `data "azurerm_role_definition"` a scope subscription (`infra/modules/azure_github_environment_bootstrap/data.tf`).

### Livello 4b — Grant assegnati dal modulo `bootstrapper`

| Grantor                             | Meccanismo                | Principal                           | Ruolo                                                                     | Scope                                             | Evidenza                                 |
| ----------------------------------- | ------------------------- | ----------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Identity che applica `bootstrapper` | `azurerm_role_assignment` | Gruppo `admins`                     | `Owner`                                                                   | `RG` principale + `additional_resource_group_ids` | `ad_admin_iam.tf`                        |
| Idem                                | Idem                      | Gruppo `admins`                     | `Key Vault Data Access Administrator`                                     | Stessi RG                                         | `ad_admin_iam.tf`                        |
| Idem                                | Idem                      | Gruppo `admins`                     | `Key Vault Administrator`                                                 | Stessi RG                                         | `ad_admin_iam.tf`                        |
| Idem                                | Idem                      | Gruppo `developers`                 | `Contributor`                                                             | Stessi RG                                         | `ad_devs_iam.tf`                         |
| Idem                                | Idem                      | Gruppo `developers`                 | `Key Vault Secrets Officer`                                               | Stessi RG                                         | `ad_devs_iam.tf`                         |
| Idem                                | Idem                      | Gruppo `externals` (opzionale)      | `Reader`                                                                  | Stessi RG                                         | `ad_ext_iam.tf`                          |
| Idem                                | Idem                      | `infra-github-cd`                   | custom role `DX Infra CD Subscription`                                    | `SUB`                                             | `id_infra_cd_iam.tf`                     |
| Idem                                | Idem                      | `infra-github-cd`                   | custom role `DX Infra CD Resource Groups`                                 | RG principale + aggiuntivi                        | `id_infra_cd_iam.tf`                     |
| Idem                                | Idem                      | `infra-github-cd`                   | custom role `DX Infra CD Private Networking`                              | `RG` di rete creato da `core`                     | `id_infra_cd_iam.tf`                     |
| Idem                                | Idem                      | `infra-github-cd`                   | `Storage Blob Data Contributor`                                           | `RES` Storage Account di state                    | `id_infra_cd_iam.tf`                     |
| Idem                                | Idem                      | `infra-github-ci`                   | custom role `DX Infra CI Subscription`                                    | `SUB`                                             | `id_infra_ci_iam.tf`                     |
| Idem                                | Idem                      | `infra-github-ci`                   | custom role `DX Infra CI Resource Groups`                                 | RG principale + aggiuntivi                        | `id_infra_ci_iam.tf`                     |
| Idem                                | Idem                      | `infra-github-ci`                   | `Storage Blob Data Contributor`                                           | `RES` Storage Account di state                    | `id_infra_ci_iam.tf`                     |
| Idem                                | Idem                      | `app-github-cd`                     | `Reader`                                                                  | `SUB`                                             | `id_app_cd_iam.tf`                       |
| Idem                                | Idem                      | `app-github-cd`                     | custom role `DX App CD Resource Groups`                                   | RG principale + aggiuntivi                        | `id_app_cd_iam.tf`                       |
| Idem                                | Idem                      | `app-github-cd`                     | `Storage Blob Data Contributor`                                           | `RES` Storage Account di state                    | `id_app_cd_iam.tf`                       |
| Idem                                | Idem                      | `app-github-ci`                     | `Reader`                                                                  | `SUB`                                             | `id_app_ci_iam.tf`                       |
| Idem                                | Idem                      | `app-github-ci`                     | custom role `DX App CI Resource Groups`                                   | RG principale + aggiuntivi                        | `id_app_ci_iam.tf`                       |
| Idem                                | Idem                      | `opex-github-ci`                    | `Reader`, `Reader and Data Access`                                        | `SUB`                                             | `id_opex_iam.tf`                         |
| Idem                                | Idem                      | `opex-github-cd`                    | `Reader`                                                                  | `SUB`                                             | `id_opex_iam.tf`                         |
| Idem                                | Idem                      | `opex-github-ci` e `opex-github-cd` | `Storage Blob Data Contributor` (+ `Reader and Data Access` per CD)       | `RES` Storage Account di state                    | `id_opex_iam.tf`                         |
| Idem                                | Idem                      | `opex-github-cd`                    | `PagoPA Opex Dashboards Contributor`, `Monitoring Contributor`            | `RG` Opex creato da `core`                        | `id_opex_iam.tf`                         |
| Idem                                | Idem                      | Identity app/infra/opex             | Federated credential verso gli environment `<piano>-<lifecycle>-<ci\|cd>` | `RES` identity                                    | `id_app.tf`, `id_infra.tf`, `id_opex.tf` |

### Livello 4c — Grant speciali generati dal template CLI (solo ramo di inizializzazione)

| Grantor                             | Meccanismo                                  | Principal         | Ruolo                       | Scope                                            | Evidenza                                                               |
| ----------------------------------- | ------------------------------------------- | ----------------- | --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Identity che applica `bootstrapper` | `azurerm_role_assignment` nel file generato | `infra-github-cd` | `User Access Administrator` | `RG` common creato dal CLI e importato da `core` | `apps/cli/templates/environment/bootstrapper/{{env.name}}/main.tf.hbs` |
| Idem                                | Idem                                        | `infra-github-cd` | `Key Vault Secrets Officer` | `RES` common Key Vault                           | Idem                                                                   |
| Idem                                | Idem                                        | `infra-github-ci` | `Key Vault Secrets User`    | `RES` common Key Vault                           | Idem                                                                   |

### Diagramma RBAC e trust OIDC

```mermaid
flowchart TB
  HUMAN["Principal umano: Owner, Storage Blob Data Contributor, Key Vault Secrets Officer a scope subscription"]
  HUMAN -->|crea e assegna ruoli| BCD["Identity bootstrap CD: RBAC Administrator, Contributor, Storage Blob Data Contributor a scope subscription"]
  HUMAN -->|crea e assegna ruoli| BCI["Identity bootstrap CI: Reader, Storage Blob Data Contributor a scope subscription"]

  AUTHREPO["eng-azure-authorization"] -->|Directory Readers| BCD
  AUTHREPO -->|ruoli a scope subscription| GROUPS["Gruppi Entra: admin, developers, externals, operations, security, tpm, product-owners, oncall"]

  BCD -->|OIDC environment bootstrapper-env-cd| APPLYBOOT["Apply del modulo bootstrapper"]
  BCI -->|OIDC environment bootstrapper-env-ci| PLANBOOT["Plan del modulo bootstrapper"]

  COREAPPLY["Apply del modulo core"] --> CUSTOM["Custom role DX a scope subscription"]
  CUSTOM --> APPLYBOOT

  APPLYBOOT --> INFRACD["infra-github-cd: custom role subscription e resource group, private networking, state"]
  APPLYBOOT --> INFRACI["infra-github-ci: custom role read-only e state"]
  APPLYBOOT --> APPCD["app-github-cd: Reader subscription, custom role RG, state"]
  APPLYBOOT --> APPCI["app-github-ci: Reader subscription, custom role RG"]
  APPLYBOOT --> OPEXCD["opex-github-cd: Reader, Opex dashboards, Monitoring, state"]
  APPLYBOOT --> OPEXCI["opex-github-ci: Reader, Reader and Data Access, state"]
  APPLYBOOT --> GRPGRANT["Gruppi admins, developers, externals su resource group scope"]

  INFRACD -->|OIDC infra-lifecycle-cd e automation-lifecycle-cd| GHENVS["GitHub environment"]
  INFRACI -->|OIDC infra-lifecycle-ci| GHENVS
  APPCD -->|OIDC app-lifecycle-cd| GHENVS
  APPCI -->|OIDC app-lifecycle-ci| GHENVS
  OPEXCD -->|OIDC opex-lifecycle-cd| GHENVS
  OPEXCI -->|OIDC opex-lifecycle-ci| GHENVS
```

## Gap, bottleneck e possibili bug

I finding sono presentati come osservazioni verificabili sul codice corrente, non come correzioni già applicate.

### 1. Divergenza a tre vie sui ruoli dei gruppi Entra

Tre fonti descrivono ruoli diversi per gli stessi gruppi:

- **Documentazione pubblica** (`apps/website/docs/monorepository-setup.mdx:55-59`): `admins` → `Contributor`, `Storage Blob Data Contributor`, `Key Vault Secrets Officer`; `developers` → `Reader`, `Monitoring Contributor`, `Support Request Contributor`; `externals` → `Reader`.
- **Modulo `bootstrapper`** (a scope resource group): `admins` → `Owner` + ruoli Key Vault; `developers` → `Contributor` + `Key Vault Secrets Officer`; `externals` → `Reader` (`ad_admin_iam.tf`, `ad_devs_iam.tf`, `ad_ext_iam.tf`).
- **CLI `DEFAULT_GROUP_SPECS`** (a scope subscription, applicato dal repository di autorizzazione): `admin`, `developers` **ed** `externals` → `Owner` (`azure-authorization-config.ts:14-15`, `:36`).

Il codice corrente del CLI porta quindi `developers` ed `externals` a **`Owner` a scope subscription**, cioè a un privilegio superiore sia a quanto documentato sia a quanto il modulo assegna a scope resource group. Per `externals` il salto è particolarmente ampio (da `Reader` su RG a `Owner` su subscription).

### 2. Divergenza di naming `admin` / `admins` e posizione del dominio

- Il CLI genera il nome `<prefix>-<envShort>-adgroup-admin` (singolare), senza dominio (`azure-authorization-config.ts:50-54`).
- Il template del `bootstrapper` cerca `<prefix>-<envShort>-<domain>-adgroup-admin`, cioè **con** il dominio prima di `adgroup` (`apps/cli/templates/environment/bootstrapper/{{env.name}}/data.tf.hbs:1-13` combinato con `apps/cli/src/adapters/plop/helpers/resource-prefix.ts:6-17`).
- La documentazione usa `<product>-<env>-adgroup-[<domain>]-admins`, cioè plurale e con il dominio **dopo** `adgroup` (`apps/website/docs/monorepository-setup.mdx:55-59`).

Nessuna delle tre forme coincide con le altre. In pratica il gruppo creato dalla PR automatica non è quello cercato dal `data "azuread_group"` del `bootstrapper`, e l'apply può fallire con "group not found" oppure agganciare un gruppo diverso da quello previsto.

### 3. Directory Readers solo per la identity CD

La PR automatica aggiunge ai Directory Readers unicamente `…-bootstrap-id-01`, cioè la identity CD (`add.ts:281-288`, `azure-authorization.ts:186-212`). La identity CI (`…-bootstrap-ci-id-01`) non viene aggiunta, pur eseguendo `terraform plan` sullo stesso codice, che include `data "azuread_group"` e quindi richiede lookup di directory. Il piano CI può fallire su una configurazione appena creata anche quando il CD funziona.

### 4. La PR di autorizzazione Azure è best-effort

`authorizeCloudAccounts` cattura ogni errore e restituisce comunque `ok`: input non valido → `logger.warn` e `continue`; fallimento della richiesta → `logger.warn`; eccezione globale → `okAsync([])` (`add.ts:268-317`). Il comando può quindi terminare con "Cloud environment created successfully!" anche se **nessuna** PR è stata aperta. Se poi la PR non viene creata, i Directory Readers e i gruppi non vengono allineati e l'apply del `bootstrapper` fallirà più tardi, in un punto lontano dalla causa.

### 5. La detection "initialized" è incompleta

`isInitialized` considera inizializzata una subscription se esistono una identity con naming atteso, un Key Vault comune con naming atteso e tutti i resource provider registrati (`cloud-account-service.ts:464-509`). Non verifica: i role assignment delle identity, la presenza e la correttezza dei secret negli environment GitHub, l'esistenza dei federated credential, la presenza dei gruppi Entra, l'appartenenza a Directory Readers. Una subscription parzialmente configurata (o rimasta a metà da un run fallito prima del cleanup) viene classificata come inizializzata e il ramo di riparazione non viene eseguito.

Effetto collaterale correlato: nel ramo "initialized" il CLI **non** genera `infra/core/<env>` né gli import block; se la baseline `core` non esiste davvero, il `bootstrapper` non troverà né le custom role né i valori esportati.

### 6. Privilegi ampi e sovrapposti a scope subscription

- La identity di bootstrap CD riceve `Contributor` **e** `Role Based Access Control Administrator` a scope **subscription**, non limitati a un resource group (`cloud-account-service.ts:75-80`). È il livello di privilegio necessario per creare le identity definitive e i loro assignment, ma resta attivo anche dopo il bootstrap: non esiste alcuna revoca o riduzione di scope nel flusso.
- Le identity definitive hanno privilegi più circoscritti, ma `infra-github-cd` conserva comunque una custom role a scope subscription che include `Role Based Access Control Administrator` (`custom_roles.tf`, `id_infra_cd_iam.tf`).
- Gli stessi gruppi (`admins`, `developers`, `externals`) ricevono grant **sia** dal repository di autorizzazione a scope subscription **sia** dal modulo `bootstrapper` a scope resource group, con ruoli diversi. La risultante effettiva è l'unione dei due, e la fonte di verità di "quali permessi ha davvero il gruppo X" è distribuita su due sistemi.

### 7. State locale di `infra/repository` e apply automatico non presidiato

`dx init` esegue `terraform init` e `terraform apply -auto-approve` su `infra/repository` con **state locale** (`init.ts:338-351`). `dx add environment` ripete `terraform apply -auto-approve` sullo stesso modulo ad ogni esecuzione (`sync-repository-environments.ts:157-159`), dopo aver modificato `main.tf` tramite **regex su blocchi HCL** (`findRepositoryBlock`, `sync-repository-environments.ts:50-138`). Conseguenze:

- non esiste una fase di plan/review su un modulo che governa repository, branch protection ed environment;
- un `main.tf` con formattazione non prevista (ad esempio `repository` su una riga, o rientri diversi) fa fallire il match o produce un patch inatteso, applicato immediatamente;
- lo state resta locale finché non viene migrato manualmente (`apps/website/docs/monorepository-setup.mdx:221-242`): se l'engineer perde la macchina o il file, la configurazione del repository perde il proprio state e la migrazione documentata contiene inoltre un comando `perl -pi -e` che riscrive `infra/bootstrapper/prod/providers.tf` anziché il file di destinazione appena copiato.

### 8. Dipendenze manuali che bloccano il completamento

Il bootstrap non è completabile senza almeno quattro interventi umani esterni al CLI: creazione/consegna delle credenziali della GitHub App (App Admin), merge della PR su `eng-azure-authorization` (CODEOWNER), apply iniziali di `core` e `bootstrapper` (EL), registrazione del repository e associazione alla GitHub App (`eng-github-authorization`). Ognuno è un punto di attesa non misurato e senza owner tracciato nel sistema.

Esiste inoltre una dipendenza d'ordine implicita: il workflow generato `_release-terraform-apply-bootstrapper-<env>.yaml` delega a `release-terraform-bootstrapper-v1.yaml`, che crea un token GitHub App e **verifica** che l'installation id risolto coincida con `GH_APP_INSTALLATION_ID` (`.github/workflows/release-terraform-bootstrapper-v1.yaml:55-71`). Questo presuppone che l'App sia già installata sul repository, cosa che avviene solo con lo Step 3 — che nel flusso AS-IS è documentato **dopo** gli apply.

### 9. Cleanup parziale e rischio di risorse orfane

In caso di errore durante `initialize`, il CLI elimina il bootstrap common RG (`cloud-account-service.ts:451-461`). Il cleanup però:

- **non** rimuove i role assignment a scope subscription già creati per le identity, che sopravvivono all'eliminazione del RG come assignment orfani;
- **non** rimuove i secret già scritti negli environment GitHub;
- **non** rimuove eventuali provider registrati;
- elimina il RG **anche quando preesisteva**, perché `createOrUpdate` non distingue creazione da riuso: un errore tardivo su una subscription già parzialmente inizializzata può cancellare un resource group condiviso con le identity di bootstrap e il Key Vault comune;
- il ramo `provisionTerraformBackend` ha un cleanup analogo limitato al fallimento della sola creazione del container (`cloud-account-service.ts:595-606`).

### 10. `repo:pagopa` hardcoded nei federated credential definitivi

`dx init` consente di scegliere l'owner del repository (`--owner`, default `pagopa`, `apps/cli/src/adapters/plop/generators/monorepo/prompts.ts`), e il modulo `bootstrapper` espone `var.repository.owner`. Tuttavia i federated credential delle identity definitive costruiscono il subject con l'owner **letterale** `pagopa`: `subject = "repo:pagopa/${var.repository.name}:environment:…"` (`id_app.tf`, `id_infra.tf`, `id_opex.tf`). Per un repository ospitato sotto un'altra organizzazione il trust OIDC non corrisponde e i workflow definitivi falliscono l'autenticazione, mentre le credenziali di bootstrap create dal CLI usano correttamente `github.owner` (`cloud-account-service.ts:730`).

### 11. Environment tenant-qualified vs nomi derivati dal solo lifecycle

Il CLI supporta environment tenant-qualified (`ced-prod`, `cgn-dev`) e li usa per: cartelle `infra/*/<env>`, environment `bootstrapper-<env>-ci/cd`, lista `environments` di `infra/repository`. Il modulo `bootstrapper` invece deriva i nomi degli environment GitHub dal **solo lifecycle** (`local.env_name` = `dev`/`uat`/`prod` da `env_short`) e scrive i secret su `infra-<lifecycle>-cd`, `app-<lifecycle>-ci`, ecc. (`infra/modules/azure_github_environment_bootstrap/locals.tf:11-15`, `:56-60`; `github_environments_secrets_cd.tf`). Con `--name ced-prod`, il modulo `github-environment-bootstrap` crea `infra-ced-prod-cd` mentre il `bootstrapper` scrive su `infra-prod-cd`: due environment diversi, con conseguente fallimento o configurazione su un environment non gestito. Lo stesso vale per i subject dei federated credential definitivi.

### 12. Configurazione Copilot scaffoldata e non allineata al marketplace

`dx init` scaffolda `.github/copilot/settings.json` (`apps/cli/templates/monorepo/.github/copilot/settings.json`), che dichiara il marketplace `pagopa-dx` puntando a `pagopa/dx` e abilita sei plugin. Due osservazioni:

- il file **abilita** implementazioni che vivono fuori dal repository generato: nulla nello scaffolding fornisce quei plugin, che dipendono interamente dal repository `pagopa/dx`. Questo è il comportamento corrente, ma diverge dall'aspettativa iniziale che il bootstrap non toccasse la configurazione Copilot;
- il template abilita `tests@pagopa-dx`, ma `.github/plugin/marketplace.json` **non dichiara** un plugin `tests` (dichiara `azure`, `terraform`, `typescript`, `project-management`, `standards`, `aiepdf`), pur esistendo una cartella `plugins/tests/`. Il plugin abilitato non è quindi risolvibile dal marketplace così com'è pubblicato.

### 13. `core` senza workflow generato né drift detection

Il CLI genera un workflow solo per il `bootstrapper` (`apps/cli/templates/environment/workflow/` contiene un unico template). Per `infra/core/<env>` non esiste né un workflow di apply né uno di drift detection: la baseline più critica dell'ambiente resta senza automazione di allineamento e ogni modifica fuori banda non viene rilevata.

### 14. Divergenza documentazione/template su devcontainer

La documentazione afferma che `init` provisiona il monorepo "with dotfiles and a devcontainer configuration" (`apps/website/docs/dx-cli/usage.md:14-16`), ma `apps/cli/templates/monorepo/` non contiene alcun file di devcontainer. La documentazione promette un artefatto che lo scaffolding corrente non produce.

### 15. `dx doctor` documentato su Turborepo, implementato su Nx

Sia `apps/cli/README.md` sia `apps/website/docs/dx-cli/usage.md` descrivono `dx doctor` come verifica di `turbo.json`, mentre il dominio verifica la presenza della configurazione Nx (`apps/cli/src/domain/doctor.ts`, `apps/cli/src/domain/repository.ts`). Non è un difetto del bootstrap in senso stretto, ma incide sul troubleshooting immediatamente successivo, quando l'engineer usa `doctor` per capire se il workspace generato è conforme.

### 16. Assenza di una guida di troubleshooting per i fallimenti di apply

Non esiste documentazione strutturata per i fallimenti più probabili del bootstrap (gruppo Entra non trovato, custom role assente perché `core` non applicato, Directory Readers mancanti in CI, trust OIDC non corrispondente, environment GitHub inesistente). Combinato con l'assenza di SLO (capitolo dedicato, `TBD`), questo rende il tempo di recupero dipendente dall'esperienza individuale e non misurabile.
