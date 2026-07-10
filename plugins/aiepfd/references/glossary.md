# AIEPFD glossary

Shared domain glossary for skills in the `aiepfd` plugin. Read this file before
interpreting or producing plugin artifacts so terms are used consistently across
skills.

This glossary mirrors the terminology in the Confluence page _Glossario del
framework AI-enabled_ and is intentionally kept in the same language.

## Acronimi

| Acronimo | Significato | Definizione nel framework |
| --- | --- | --- |
| **AC** | Acceptance Criteria | Criteri verificabili che descrivono il comportamento atteso e vengono usati per validare Story, Task e test. |
| **ADR** | Architecture Decision Record | Documento _code-adjacent_ nel repository che traccia decisioni implementative locali prese da Engineering o dai coding agent. |
| **AI** | Artificial Intelligence | Componente abilitante del framework: agenti, Skill, automazioni e validazioni assistite. |
| **API** | Application Programming Interface | Interfaccia tecnica tra sistemi; nel framework deve essere tracciata e preferibilmente descritta da un contratto machine-readable. |
| **CI** | Continuous Integration | Esecuzione automatica di check deterministici su build, test, contratti e regressioni. |
| **CI/CD** | Continuous Integration / Continuous Delivery | Pipeline di integrazione e rilascio che rende verificabile e ripetibile la delivery agentica. |
| **CR** | Change Request | Unita di governo del cambiamento materiale: traccia impatto, reviewer richiesti e propagazione verso artefatti downstream. |
| **DAG** | Directed Acyclic Graph | Modello di orchestrazione delle Skill, con precondizioni esplicite e step eseguibili in ordine deterministico. |
| **DevEx** | Developer Experience | Funzione owner della toolchain per la fase di delivery agentica. |
| **DLQ** | Dead Letter Queue | Coda o area di recupero per eventi non processati, utile per diagnosi, replay e resilienza della toolchain. |
| **DM** | Data Masking | Insieme di regole che minimizzano e filtrano i dati prima delle scritture cross-tool, soprattutto su contenuti sensibili. |
| **DoD** | Definition of Done | Checklist di completamento operativo o tecnico incorporata nella descrizione di Story e Task. |
| **DoR** | Definition of Ready | Gate deterministico che verifica se una Story o un Task e abbastanza completo da poter esser preso in carico. |
| **DPIA** | Data Protection Impact Assessment | Documento privacy da collegare al contratto quando il caso d'uso tratta dati personali o impatti rilevanti. |
| **DR** | Design Review | Documento tematico che descrive lo stato corrente approvabile del framework e aggrega le decisioni di alto livello. |
| **DR (SRS)** | Design Review (sinonimo di _Software Requirements Specification_) | Documento vivo che unifica review e requisiti, ed e la fonte di verita operativa per backlog e implementazione. |
| **E2E** | End-to-End | Test o gate che validano un flusso completo dall'ingresso all'esito finale. |
| EPIC | Epica | Iniziativa o capability di valore business, misurabile e rilasciabile. |
| **HITL** | Human-in-the-Loop | Approvazione o review umana obbligatoria prima che un output AI-generated possa entrare in esecuzione. |
| **IAM** | Identity and Access Management | Modello di identita, permessi minimi e service account dedicati per agenti e Skill. |
| **IaC** | Infrastructure as Code | Gestione dell'infrastruttura come codice versionato, validabile e rilasciabile tramite pipeline. |
| **JTBD** | Jobs To Be Done | Modello che descrive il bisogno utente in termini di outcome; nel framework collega PRD, Use Case, backlog e KPI. |
| **JSM** | Jira Service Management | Canale operativo per supporto e incidenti, usato anche nell'incident-to-requirement bridge. |
| **KB** | Knowledge Base | Base di conoscenza di supporto: FAQ, guide operatore, manuali e link necessari prima del go-live. |
| **KPI** | Key Performance Indicator | Metrica di successo usata per misurare outcome, adozione, qualita, rollout ed efficacia del framework. |
| **MCP** | Model Context Protocol | Protocollo per accesso tool-native a sistemi esterni come Confluence, Jira, Figma o cataloghi dati. |
| **MSA** | Minor Scope Adjustment | Piccolo aggiustamento di scope ammesso solo se non cambia il comportamento atteso e non richiede una nuova Story o CR. |
| **OpenAPI** | OpenAPI Specification | Contratto tecnico machine-readable per API HTTP, usato per generazione, validazione e breaking-change detection. |
| **PII** | Personally Identifiable Information | Dati personali che devono essere rilevati, filtrati o mascherati prima di scritture su tool condivisi. |
| **PM** | Project / Product Manager | Ruolo che governa priorita, backlog, review HITL e decisioni operative di avanzamento. |
| **PMO** | Project Management Office | Funzione che monitora rollout, milestone, KPI e stato di adozione del framework. |
| **PR** | Pull Request | Unita di review del codice collegata a evidenze, test, change impact e aggiornamento dei contratti tecnici. |
| **PRD** | Product Requirements Document | Documento di requisiti di prodotto orientato a outcome, JTBD, metriche, vincoli e perimetro. |
| **QA** | Quality Assurance | Funzione che collega acceptance criteria, Gherkin, test plan, coverage e validazione di qualita. |
| **RFC** | Request for Comments | Documento di discussione decisionale: raccoglie opzioni e trade-off, ma diventa operativo solo dopo recepimento nella DR madre. |
| **SLI** | Service Level Indicator | Indicatore osservabile usato per misurare salute, qualita o affidabilita di un servizio. |
| **SLO** | Service Level Objective | Obiettivo target associato a servizio, processo o iniziativa. |
| **SRE** | Site Reliability Engineering | Funzione che osserva runtime, incidenti, rollback, alerting e feedback post-release. |
| **UC** | Use Case | Caso d'uso con ID stabile, trigger, precondizioni, flussi, edge case e acceptance checks. Descrive in modo strutturato **l'intera interazione** tra un utente (attore) e le componenti del sistema per raggiungere un obiettivo. |
| **UX** | User Experience | Dimensione di design che copre flussi, accessibilita, componenti Figma e qualita dell'interazione. |

## Concetti e funzionalita chiave

| Termine | Definizione |
| --- | --- |
| **Contratto strutturato** | Insieme minimo di informazioni verificabili che descrive un deliverable e abilita automazioni downstream, indipendentemente dal formato originale. |
| **Authoring tool-native** | Principio per cui ogni funzione lavora nel proprio strumento naturale (Confluence, Jira, Figma, GitHub, data catalog) senza dover scrivere formati tecnici artificiali. |
| **Metadati emergenti / derivati** | Metadati calcolati da agenti o script, come coverage, drift o breaking change, invece di essere compilati a mano. |
| **Shadow pre-fill metadata** | Precompilazione automatica dei metadati Jira in stato draft, con conferma umana prima dell'attivazione. |
| **Feedback loop chiuso** | Ciclo in cui l'agente genera, valida, corregge e produce evidenze prima dell'handoff umano. |
| **Platform Standards** | Baseline tecnica che definisce come un agente deve operare su workspace, repository, contratti tecnici, CI e ambienti. |
| **Greenfield spec-first / contract-first** | Modalita per nuove iniziative: il contratto approvato precede il codice e guida generazione, implementazione e validazione. |
| **Brownfield infer-and-ratify** | Modalita per sistemi esistenti: contratti e ADR vengono inferiti da codice, infrastruttura e runtime, poi revisionati e ratificati. |
| **Support Readiness / Operations Contract** | Set minimo di KB, runbook, error catalog, capability operative e accessi dati richiesti prima del go-live per le funzionalita di assistenza (_operations_). |
| **Change Request flow** | Flusso che governa le modifiche materiali a requisiti, API, dati, design o compliance tramite triage, approvazione e propagazione. |
| **Propagation matrix** | Mappa degli artefatti che devono essere aggiornati quando cambia una sorgente di verita, per evitare drift cross-tool. |
| **Artifact change detection** | Rilevazione automatica o assistita di cambiamenti materiali che richiedono una CR o aggiornamenti downstream. |
| **Skill taxonomy** | Classificazione delle Skill in consultive, generative o bloccanti, con precondizioni e responsabilita esplicite. |
| **Plugin / Skill registry** | Catalogo leggero di Skill, plugin, prompt, workflow e tool MCP con owner, versione, input, output e rischi. |
| **Metadata-only extraction** | Regola di minimizzazione per cui da fonti sensibili si estraggono solo stato e metadati, non testo integrale. |
| **Least privilege** | Principio per cui ogni agente o service account riceve solo i permessi strettamente necessari al proprio dominio. |

## Ruoli e responsabilita nel framework

| Ruolo / funzione | Responsabilita principale |
| --- | --- |
| **Product** | Ha l'ownership del PRD, governa JTBD, outcome e contenuto dei contratti di prodotto. |
| **PM** | Governa priorita, sprint, review HITL e approvazione operativa del backlog AI-generated. |
| **Platform** | Definisce la toolchain, automazioni, Skill, registry, audit, fallback e osservabilita della piattaforma agentica che implementa il Framework AI-enabled. |
| **DevEx** | Definisce e implementa gli standard tecnici, integrazioni e baseline necessari alla fase di delivery ("Delivery Standards"). |
| **Engineering** | Implementa codice, contratti tecnici e test seguendo Framework AI e Delivery Standards; produce o valida ADR. |
| **Design / UX** | Produce flussi Figma, componenti, annotazioni di accessibilita e mapping tra Story e interfacce. |
| **Security / Privacy** | Valida trust boundary, review di sicurezza, DPIA, masking, PII filter e re-review sui cambi materiali. |
| **Data / Analytics** | Gestisce metriche aggregate, tracking, data contract, ingestion dei dati. |
| **QA** | Traduce AC in test, mantiene coverage e verifica coerenza tra comportamento atteso e implementazione. |
| **Assistance / Ops** | Valida support readiness, KB, runbook, error catalog e supportabilita operativa delle capability rilasciate. |
| **SRE** | Monitora runtime, alerting, incidenti, rollback e segnali operativi post-release. |
| **PMO** | Monitora stato di adozione, milestone, rollout e KPI del framework a livello organizzativo. |

## Differenza rapida: Platform vs Engineering

| Funzione | Focus |
| --- | --- |
| **Platform** | Definisce e approva il **come** un agente puo lavorare in modo sicuro, standardizzato e governabile. |
| **Engineering** | Esegue il **cosa** va implementato nel prodotto, usando i contratti e gli standard definiti a monte. |

## Nota d'uso

Questo glossario e pensato come documento vivo: quando una RFC viene accettata
e recepita nella DR madre, anche le definizioni qui presenti dovrebbero essere
aggiornate.
