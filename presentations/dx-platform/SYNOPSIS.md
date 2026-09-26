# DX Platform — Sinossi della presentazione interattiva

<!-- SYN-META -->

## Metadata

| ID               | Campo    | Valore                                                                 |
| ---------------- | -------- | ---------------------------------------------------------------------- |
| `syn.meta.title` | Titolo   | DX Platform — Strumenti riusabili per SDLC agentico                    |
| `syn.meta.owner` | Owner    | PagoPA DX Team                                                          |
| `syn.meta.status`| Stato    | draft                                                                  |
| `syn.meta.format`| Formato  | Presentazione HTML interattiva (18 slide) + questa sinossi              |
| `syn.meta.path`  | File     | [`./index.html`](./index.html)                                          |
| `syn.meta.lang`  | Lingua   | Italiano (termini tecnici e identificatori in inglese)                  |

<!-- SYN-01 -->

## 1. Tesi

Il collo di bottiglia dello sviluppo non è più la scrittura del codice: è il
**contesto**. Gli agenti amplificano ciò che trovano: se uno standard vive in un
modulo, in un workflow o in una skill, lo ereditano e lo replicano; se vive in
una testa, in una chat o in una wiki, lo reinventano — in modo diverso ogni
volta.

La DX Platform è l'insieme di astrazioni che sposta la conoscenza dagli individui
agli artefatti eseguibili. Il risultato atteso è duplice:

- per le **persone**: meno decisioni, meno codice da interpretare, onboarding
  senza downtime;
- per gli **agenti**: meno contesto da esplorare, meno token, meno latenza, meno
  variabilità.

<!-- SYN-02 -->

## 2. I pilastri del valore (in epoca agentica)

| ID        | Pilastro                       | Cosa significa in pratica                                                                                                                              |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `syn.v1`  | Update centralizzati           | Un fix in un modulo o workflow arriva a tutti i repository; le versioni seguono semver e changelog generati. Manutenzione O(1) per piattaforma, non O(n) per repo.          |
| `syn.v2`  | Determinismo e governance      | Naming, CIDR, tag, IAM e policy derivano da contratti: stesso input → stesso output per umani e agenti. La compliance è codice, non un documento.        |
| `syn.v3`  | Riduzione del bus factor       | La conoscenza sta in moduli, skill, documentazione, istruzioni di repository e provider, non nelle persone. L'onboarding è clonare e leggere gli artefatti.                     |
| `syn.v4`  | Riduzione del contesto         | L'agente carica contratti mirati (skill, istruzioni, moduli) invece di esplorare il repository. Meno contesto = meno token, meno tempo, meno errori.           |
| `syn.v5`  | Democratizzazione (no experts required) | Fare infrastruttura, pipeline e deploy di qualità non richiede un esperto cloud in ogni team: l'expertise vive nella piattaforma, il team porta il dominio. Con gli agenti chi sa descrivere il bisogno può arrivare in produzione. |

La presentazione esprime `syn.v4` anche in modo interattivo, con un misuratore
"senza astrazioni vs con DX" su un task IaC tipo (valori illustrativi).

<!-- SYN-03 -->

## 3. La mappa della piattaforma

I layer, dal basso verso l'alto, sono navigabili nella slide "mappa" e hanno una
slide di dettaglio ciascuno; una slide conclusiva mostra la dipendenza tra i
layer con un esempio di deploy end-to-end:

0. **Toolchain del monorepo** — il layer zero che `dx-cli init` scaffolda:
   workspace pnpm, task graph Nx, mise con lockfile, pre-commit, convenzioni di
   cartelle e plugin DX già abilitati.
1. **Bootstrapping** — la parte cloud del `dx-cli init`: ruoli e permessi CSP,
   federated identity, GitHub Environments e runner self-hosted.
2. **Hub & Spoke** — infrastruttura di piattaforma per ambiente: il core di
   rete (VNet, DNS, VPN cross-cloud, Logs, Policy), l'hub con i servizi
   condivisi (API gateway, Key Vault, messaggistica) e i domini applicativi
   come spoke, pronti a ospitare nuove iniziative.
3. **Moduli Terraform** — moduli versionati nel registry pubblico `pagopa-dx`
   per le risorse più comuni, con provider DX che inferiscono naming, CIDR e tag.
4. **Pipelines** — GitHub Actions riusabili per validazione (CI) e release (CD)
   su monorepo multi-linguaggio orchestrato da Nx.
5. **Artefatti per agenti** — plugin, skill, istruzioni di repository e
   isomorfismo degli ambienti con mise.
6. **Osservabilità** — tracing OpenTelemetry, dashboard OpEx generate da OpenAPI,
   metriche di piattaforma.

<!-- SYN-04 -->

## 4. I layer in dettaglio

### 4.0 Toolchain del monorepo (`syn.l0`)

Il layer zero è la toolchain che `dx-cli init` scaffolda nel repository. Non è
un dettaglio: è il contratto che rende componibile tutto il resto.

- **Workspace pnpm** (`pnpm-workspace.yaml`) con le cartelle `apps/*` e
  `packages/*` e le dipendenze interne via `workspace:^`.
- **Nx workspace** (`nx.json`) come task graph unico: plugin per TypeScript,
  ESLint e Vitest, `targetDefaults` per lint/test, release con version plan.
- **mise** (`mise.toml` + `mise.lock`) con i tool fissati: Node, pnpm,
  Terraform, TFLint, Trivy, terraform-docs, pre-commit, GitHub CLI. `mise
  install` allinea la macchina alla CI.
- **Pre-commit** con gli hook DX e `pre-commit-terraform`: format, validate,
  tflint, trivy e lock dei provider/moduli.
- **File di configurazione condivisi**: `.editorconfig`, `.tflint.hcl`,
  `.trivyignore`, versioni in `.node-version` e `.terraform-version`.
- **Contratto di struttura**: `apps/`, `packages/`, `infra/{repository,bootstrapper,core,resources}`,
  `docs/` — gli agenti sanno sempre dove guardare.
- **Plugin DX già abilitati** in `.github/copilot/settings.json`: il marketplace
  `pagopa-dx` e i plugin consigliati sono versionati nel repository, quindi non
  dipendono dalla configurazione della singola macchina.

### 4.1 Bootstrapping (`syn.l1`)

- `npx @pagopa/dx-cli init` genera la struttura `infra/{repository,bootstrapper,core,resources}`
  e apre una PR sul nuovo repository; `dx add environment` aggiunge dev/uat/prod.
- Ruoli e permessi nascono da gruppi Entra ID per prodotto e ambiente:
  `admin` (Contributor, Key Vault Secrets Officer), `developers` (Reader,
  Monitoring Contributor), `externals` (Reader); il gruppo `vpn` abilita
  l'accesso alle risorse private.
- Un **GitHub App per prodotto** gestisce il runner self-hosted; i workflow
  usano **OIDC federated identity** verso Azure/AWS, senza credenziali a lunga
  vita. Runner su Container Apps Jobs (Azure) o CodeBuild (AWS).
- La parte `bootstrapper` di Terraform crea ambienti GitHub `*-ci` e `*-cd`,
  federazione, runner e repository.

### 4.2 Hub & Spoke (`syn.l2`)

Topologia hub-and-spoke, resa nella presentazione come schema architetturale:

- **Core** (`infra/core/<env>`): la rete — VNet e subnet, DNS privato, VPN
  AWS↔Azure, Log Analytics/Application Insights, policy. Espone valori alle
  configurazioni successive tramite un core values exporter.
- **Hub** (`infra/resources/<env>`): i servizi condivisi raggiunti su rete
  privata — API gateway (API Management), Key Vault, namespace di messaggistica.
- **Spoke**: i domini applicativi (es. Pagamenti, Notifiche, Identità,
  Onboarding), che al loro interno contengono i singoli servizi; i servizi dati
  restano risorse dei team, non hub. Una nuova iniziativa si innesta sulla
  stessa rete riusando l'hub esistente.

### 4.3 Moduli Terraform (`syn.l3`)

- Module-first: prima i moduli pubblici `pagopa-dx`, poi le risorse raw solo se
  necessarie.
- I provider custom DX (Azure e AWS) derivano naming, CIDR e tag dai nomi,
  riducendo il numero di parametri e gli errori.
- Contratti versionati con semver, changelog generati e version plan; README, esempi e test e2e
  validati in CI (tflint, trivy, terraform-docs).

### 4.4 Pipelines (`syn.l4`)

- **CI**: `validate` esegue sull'affected di Nx build, test, lint, typecheck,
  static analysis e `terraform plan` con commento sulla PR; i version plan
  mancanti producono un warning. Il grafo delle dipendenze calcola l'insieme
  dei progetti coinvolti: una modifica entra in CI insieme ai soli consumatori.
- **CD**: al merge su `main` parte la release Nx (PR "Version Packages" → versioni,
  changelog, publish su npm con provenance, tag e GitHub Release) e il deploy delle app (App
  Service, Container App, statiche) e dell'infrastruttura.
- **Multi-linguaggio**: TypeScript, Go, Python e Terraform convivono nello stesso
  task graph Nx con cache e `affected`.
- Job di manutenzione ricorrenti: drift detection, keep-alive, rinnovo
  certificati TLS.

### 4.5 Artefatti per agenti (`syn.l5`)

- **Plugin marketplace DX** (`terraform`, `azure`, `aiepdf`,
  `project-management`, `standards`, `tests`, `typescript`) con skill, agenti,
  comandi e hook: l'insieme cresce senza cambiare il contratto d'uso.
- **Skill esemplari**: `terraform-best-practices` (module-first + validazione
  obbligatoria), `technology-radar` (blocca tecnologie deprecate),
  `azure-keyvault-secret` (pattern `value_wo` senza segreti in state),
  `generate-backend-tests`.
- **Istruzioni di repository**: `AGENTS.md` e `.github/instructions/*` rendono
  espliciti gli standard per ogni agente; le skill hanno eval e fixture proprie.
- **Isomorfismo ambienti con mise**: `mise.toml` + lockfile fissano gli stessi
  tool in devcontainer, runner e CI — dev = CI = produzione dei task.

### 4.6 Osservabilità (`syn.l6`)

- `@pagopa/azure-tracing`: wrapper OpenTelemetry per App Service, Function App e
  Container App (incluso fetch nativo ed ESM).
- Log Analytics e Application Insights nel core; dashboard OpEx generate dai
  file `.opex/**/config.yaml` a partire dagli OpenAPI.
- La piattaforma misura se stessa: metriche DX di adozione e pipeline health, più
  telemetria di pipeline (`setup-telemetry`, `log-telemetry-event`).

### 4.7 La dipendenza tra i layer (`syn.l7`)

I layer non sono una collezione di strumenti: sono una catena di dipendenze.
L'esempio della presentazione è la release di una container app, che attraversa
tutti i layer:

| Layer                 | Contributo al deploy                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| L01 · Bootstrapping   | Il job entra nel GitHub Environment `*-cd` via OIDC: la federated identity decide ruoli e permessi.    |
| L00 · Toolchain       | `pnpm nx build` usa la toolchain di mise e lockfile, con cache e `affected`: build riproducibile.      |
| L04 · Pipelines       | Il workflow riusabile orchestra build, push dell'immagine e deploy della revision.                     |
| L03 · Moduli          | Il modulo (es. `azure_container_app`) espone le opzioni del servizio: immagine, variabili, segreti, scale. |
| L02 · Hub & Spoke     | Key Vault, API gateway e rete privata esistono già nell'ambiente: nessun cablaggio manuale.            |
| L06 · Osservabilità   | La nuova revision traccia su Application Insights e le dashboard OpEx si rigenerano dall'OpenAPI.      |

È questo che rende la piattaforma tale: rimuovi un layer e il deploy torna a
essere un lavoro da esperti — e la democratizzazione (`syn.v5`) sparisce.

<!-- SYN-05 -->

## 5. Standard, non magia

La piattaforma non introduce un DSL proprietario né un runtime custom: compone
tecnologie che persone e agenti già conoscono — Terraform, GitHub Actions, Nx,
OpenTelemetry, Agent Skills, mise, OpenAPI.

Conseguenze:

- gli agenti sono già "addestrati" agli standard e non devono imparare una
  piattaforma;
- l'astrazione vive nei moduli e nei workflow, non in un layer magico;
- esiste una exit strategy: gli artefatti restano leggibili e portabili anche
  fuori dalla piattaforma.

<!-- SYN-06 -->

## 6. Framework AI e SDLC agentico

### 6.1 Il framework `aiepdf`

La catena di skill che trasforma l'intento in backlog eseguibile, mantenendo un
unico filo di tracciabilità (`JTBD-XX` → `UC-XX` → `AC-UC-XX-YY` → issue Jira):

1. **PRD Alchemist** — discovery → PRD a esiti con attori, JTBD, metriche,
   guardrail; `draft → review` solo su conferma esplicita.
2. **DR Blacksmith** — PRD/RFC → Design Review/SRS operativo: confini,
   componenti, contratti, NFR, rollout; un RFC accettato non guida
   l'implementazione finché non è propagato nel DR/SRS.
3. **UC Engraver** — Use Case figli con flussi, postcondizioni e acceptance
   check binari; gli attori sono copiati esattamente dal PRD.
4. **Jira Magister** — proiezione su Jira di Epic/Story/Task con traceability e
   Definition of Ready; richiede conferma esplicita prima di ogni mutazione.
5. **Confluence Librarian** — pubblicazione che preserva struttura, ID stabili e
   stato del documento; conferma prima delle operazioni irreversibili.

Regole trasversali: *ask, never infer*; gli ID stabili sono un contratto; le
skill hanno eval e fixture proprie; gli strumenti Atlassian e Figma forniscono
il contesto operativo.

### 6.2 Il SDLC che ci aspettiamo

```
Intento → PRD → DR/SRS → Use Case + AC → Backlog Jira
        → Implementazione (agenti + skill + istruzioni)
        → CI/CD deterministiche (Nx + GitHub Actions + Terraform)
        → Osservabilità → feedback sull'intento
```

- Gli agenti coprono l'intero ciclo; gli umani presidiano i **gate di
  decisione** (review di PRD e DR, approvazione del backlog, merge e apply).
- Ogni handoff è un **artefatto versionato**, non un messaggio in chat: la
  tracciabilità è la vera interfaccia tra prodotto, design ed engineering.
- I guardrail sono deterministici: se un output non rispetta gli standard, la
  pipeline lo blocca prima della review umana.

<!-- SYN-07 -->

## 7. Adozione

1. `npx @pagopa/dx-cli init` — bootstrap di repository, ambienti, runner e
   plugin agentici già configurati: nessun setup manuale aggiuntivo.
2. Lavorare nel ciclo agentico — **PRD → DR → ticket → PR → CI → CD**: gli
   agenti guidano il flusso, la piattaforma esegue i guardrail.

Esiti attesi: prima API in produzione in minuti, onboarding senza downtime,
meno decisioni per ogni rilascio, standard aggiornati centralmente.

<!-- SYN-08 -->

## 8. Struttura della presentazione

| #  | Slide                                  | Messaggio chiave                                                            |
| -- | -------------------------------------- | --------------------------------------------------------------------------- |
| 1  | Cover                                  | DX Platform: strumenti riusabili per SDLC agentico                          |
| 2  | La tesi                                | Il collo di bottiglia è il contesto: budget di contesto a blocchi           |
| 3  | Cinque ragioni economiche              | Update centralizzati, determinismo, bus factor, contesto, democratizzazione (widget interattivo) |
| 4  | Mappa della piattaforma                | Layer componibili: materiali dall'alto (L06) al più basso (L00), cliccabili |
| 5  | Layer 00 · Toolchain del monorepo      | Il contratto scaffoldato da dx-cli: pnpm, Nx, mise                          |
| 6  | Layer 01 · Bootstrapping               | Ruoli, permessi, runner e OIDC in un comando                                |
| 7  | Layer 02 · Hub & Spoke                 | Schema hub-and-spoke: core di rete, hub, domini applicativi ai raggi        |
| 8  | Layer 03 · Moduli Terraform            | Module-first, contratti versionati, provider DX (snippet d'uso)             |
| 9  | Layer 04 · Pipelines                   | CI/CD riusabili su monorepo multi-linguaggio con Nx (mock commento PR)      |
| 10 | CI su ciò che è affected               | Grafo delle dipendenze e confronto di velocità della CI (animati)           |
| 11 | Layer 05 · Artefatti per agenti        | Plugin, skill, istruzioni, isomorfismo con mise                             |
| 12 | Layer 06 · Osservabilità               | Tracing, dashboard OpEx, metriche di piattaforma                            |
| 13 | Dipendenza tra layer                   | Percorso del deploy attraverso i materiali: IAM, build, modulo, pipeline, hub, trace |
| 14 | Standard, non magia                    | Nessun DSL o runtime custom (widget comparativo)                            |
| 15 | Framework AI · aiepdf                  | Dall'intento al backlog guidato dagli agenti AI (stepper interattivo)       |
| 16 | SDLC agentico                          | Gli agenti lavorano, gli umani decidono (timeline animata)                  |
| 17 | Adozione                               | `dx-cli init` e ciclo agentico PRD → DR → ticket → PR → CI → CD             |
| 18 | Chiusura                               | Principi e link                                                             |

Elementi visivi: layer presentati come materiali impilati con ordine
visualizzato dall'alto verso il basso, percorso del deploy con spina animata,
schema architetturale hub-and-spoke, budget di contesto a blocchi, grafo delle
dipendenze per la CI affected con confronto di velocità, ruoli Entra ID, tile
con icone, mock (commento PR, chat agente), terminale con lo scaffold `dx-cli`
e snippet d'uso dei moduli, trace waterfall, timeline animate, catena PRD → CD
e snippet di esempio per le skill `aiepdf`.
Nessun conteggio hard-coded: i numeri della piattaforma cambiano, i contratti
no.

Interazioni disponibili: `←`/`→`/`Spazio` per navigare, `O` per la griglia
overview, `F` per il fullscreen, `?` per le scorciatoie, swipe su touch,
barra di avanzamento, contatore slide e animazioni con `prefers-reduced-motion`
rispettato.

<!-- SYN-09 -->

## 9. Fonti nel repository

| ID       | Riferimento                                                                 | Uso nella presentazione                     |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `syn.r1` | [`apps/website/docs/monorepository-setup.mdx`](../../apps/website/docs/monorepository-setup.mdx) | Bootstrapping, ruoli Entra ID, GitHub App, dx-cli |
| `syn.r2` | [`infra/modules/`](../../infra/modules/)                                     | Catalogo moduli Terraform e provider DX     |
| `syn.r3` | [`infra/core/`](../../infra/core/), [`infra/resources/`](../../infra/resources/) | Layer core e hub per ambiente            |
| `syn.r4` | [`actions/`](../../actions/), [`.github/workflows/`](../../.github/workflows/) | Composite action e workflow riusabili    |
| `syn.r5` | [`apps/website/docs/pipelines/`](../../apps/website/docs/pipelines/)         | CI/CD, Nx release, OpEx dashboard           |
| `syn.r6` | [`apps/website/docs/coding-with-ai/`](../../apps/website/docs/coding-with-ai/) | Plugin marketplace e skill                 |
| `syn.r7` | [`packages/azure-tracing/`](../../packages/azure-tracing/)                   | Osservabilità OpenTelemetry                 |
| `syn.r8` | [`plugins/aiepdf/`](../../plugins/aiepdf/)                                   | Framework AI e ciclo PRD → backlog          |
| `syn.r9` | [`mise.toml`](../../mise.toml), [`containers/self-hosted-runner/`](../../containers/self-hosted-runner/) | Isomorfismo ambienti              |

<!-- SYN-10 -->

## 10. Link pubblici

- Documentazione: <https://dx.pagopa.it/docs/>
- Repository: <https://github.com/pagopa/dx>
- Moduli Terraform: <https://registry.terraform.io/namespaces/pagopa-dx>
- Plugin marketplace: <https://github.com/pagopa/dx/tree/main/plugins>
- Framework AI: <https://github.com/pagopa/dx/tree/main/plugins/aiepdf>
