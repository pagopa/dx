# PRD - _<titolo dell'iniziativa>_

<!--
  AUTHORING GUIDANCE — DELETE THIS ENTIRE COMMENT BLOCK IN THE FINISHED DOCUMENT.

  Write the PRD in Italian unless the user explicitly requests another
  language. Translate the title, visible headings, prose, and explanatory cell
  content, regardless of the language of source material or an existing PRD.
  Keep the five standardized table headers below unchanged. The suffixes
  `(Sempre)`, `(Se Applicabile)`, and `(Opzionale)` are author-only requirement
  labels. Include every `(Sempre)` section, use the other sections according
  to their labels and requested lifecycle gate, and remove these suffixes from
  every heading in the finished PRD.
  Preserve stable section comments, field IDs, and lifecycle status tokens in
  their canonical forms for all included sections.
  In Italian, express JTBD as “Quando ..., voglio ..., così posso ...” and use
  exactly “Sì” or “No” in the open-question blocker cell. If the user
  explicitly requests English, use exactly “Yes” or “No”.
  Replace placeholders only with confirmed information. A draft may be
  incomplete: record missing information as an open question, assumption, or
  justified Non applicabile value.
  Distinguish review completion from request status: an incomplete review does
  not mean "not requested." Use "Non valutato — stato della richiesta
  sconosciuto" unless a source explicitly says whether a review or assessment
  was requested.
  Do not infer priorities, owners, metric cadence, baselines, targets, or
  thresholds. Preserve the exact reporting period and label proposals as
  unapproved.
  Give every narrative sentence an explicit subject that identifies the actor,
  owner, user group, team, stakeholder, or system. If the source does not name
  the subject, record a targeted open question instead of inventing one.
  Preserve every stable section comment and every ID exactly as written for
  included sections; remove the anchor along with any omitted section.
  Status starts as draft. The supported lifecycle states are: draft,
  discovery, evaluation, approved, execution, and archived (legacy review is
  also supported). Keep these status values in their canonical form.
  In the open-questions table, enter exactly "Sì" or "No" in the Bloccante?
  cell for Italian, or "Yes" or "No" for an explicitly requested English PRD.
  Include the impact alongside the question; do not append rationale to the
  blocker value.
  A status change requires an explicit user request and validation against
  stage-appropriate gate entry criteria; never infer transitions or treat user
  assertions as shortcuts.
  Approval strictly requires explicit Product review and Design review
  sign-off. A linked Design Review artifact does not substitute for
  review evidence.
-->

<!-- id: metadata -->

## Metadati (Sempre)

| ID                          | Valore                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| `metadata.status`           | draft                                                             |
| `metadata.sponsor`          | _<name or function>_                                              |
| `metadata.owner`            | _<Product owner>_                                                 |
| `metadata.budget`           | _<fonte del budget o Non applicabile — motivo>_                    |
| `metadata.legal-compliance` | _<Non valutato — stato della richiesta sconosciuto / Richiesto / Ricevuto / Non applicabile — motivo>_ |
| `metadata.engineering`      | _<Non valutato — stato della richiesta sconosciuto / Richiesto / Ricevuto / Non applicabile — motivo>_ |
| `metadata.target-release`   | _<data, trimestre o Non applicabile — motivo>_                     |
| `metadata.priority`         | _<Alta / Media / Bassa / Non applicabile — motivo>_                |
| `metadata.product-review`   | _<In attesa / Approvato da <nome> (<ruolo>) il <YYYY-MM-DD>>_      |
| `metadata.design-review`    | _<In attesa / Approvato da <nome> (<ruolo>) il <YYYY-MM-DD>>_      |
| `metadata.approval-decision` | _<Non decisa / Decisione di procedere presa da <nome> (<ruolo>) il <YYYY-MM-DD>>_ |
| `metadata.delivery-alignment` | _<Non confermato / Confermato da <nome> (<ruolo>) il <YYYY-MM-DD>>_ |

<!-- id: related-artifacts -->

## Artefatti correlati (Opzionale)

_<Include when applicable, or write Not applicable with a confirmed reason.
Links to a solution design do not substitute for formal Product or Design
review sign-offs. Keep the review record separate from the execution-ready
solution-design reference.>_

| ID                                  | Artefatto                      | Link o riferimento                  | Stato / note                                                     |
| ----------------------------------- | ------------------------------ | ----------------------------------- | ---------------------------------------------------------------- |
| `artifacts.design-review`           | Revisione di Prodotto e Design | _<link or N/A - reason>_            | _<linked review evidence; not a sign-off by itself>_             |
| `artifacts.solution-design`         | Progettazione della soluzione  | _<link or N/A - reason>_            | _<linked and aligned to approved PRD / not yet available>_        |
| `artifacts.figma`                   | Figma / esplorazione del design | _<link or N/A - reason>_           | _<relevant prototype or flow>_                                    |
| `artifacts.service-blueprint`       | Service Blueprint              | _<link or N/A - reason>_            | _<relevant journey>_                                              |
| `artifacts.rfc`                     | Proposte tecniche              | _<link or N/A - reason>_            | _<technical proposal link>_                                       |
| `artifacts.analytics`               | Analisi / dashboard del funnel | _<link or N/A - reason>_            | _<metrics data source>_                                           |
| `artifacts.epic-board`              | Epic Jira / board di consegna  | _<links or N/A - confirmed reason>_ | _<available / not yet available; owner or gap>_                  |
| `artifacts.post-release-observation` | Risultati dopo il rilascio     | _<link or N/A - confirmed reason>_  | _<observation window, measured outcomes, owner>_                  |
| `artifacts.closure-decision`        | Decisione di chiusura          | _<decision log or reference>_       | _<completed / superseded / canceled; decision owner/date>_        |

<!-- id: need -->

## Definizione dell'esigenza (Sempre)

_<Name the affected users or business actors and describe their context and need
without assuming a solution.>_

<!-- id: actors -->

## Destinatari (Sempre)

| Persona              | Definizione              |
| -------------------- | ------------------------ |
| `actors.item-001` _<persona>_ | _<descrizione di comportamenti e bisogni confermata>_ |

<!-- id: scope-boundaries -->

## Ambito e confini (Opzionale)

_<Record product outcomes/capabilities in scope and explicit non-goals. Keep
system components, protocols, and implementation details in downstream
technical artifacts.>_

| ID                              | Confine       | Descrizione     | Conferma o fonte       |
| ------------------------------- | ------------- | --------------- | ---------------------- |
| `scope.in-scope.item-001`       | In ambito     | _<outcome>_     | _<evidence>_            |
| `scope.out-of-scope.item-001`   | Fuori ambito  | _<non-goal>_    | _<evidence>_            |

<!-- id: objectives -->

## Obiettivi (Sempre)

<!-- id: objectives.user-goals -->

### Obiettivi utente (Sempre)

For user-facing initiatives, express each goal as a JTBD:
“When [situation], I want [objective], so I can [expected outcome].”

| Goal ID                        | Persona     | Job statement | Expected outcome | Success metric | Quality guardrail | Priority | Notes |
| ------------------------------ | ----------- | ------------- | ---------------- | -------------- | ----------------- | -------- | ----- |
| `objectives.jtbd.item-001`     | _<persona>_ | _<Quando ..., voglio ..., così posso ...>_ | _<outcome>_ | _<metric or unconfirmed>_ | _<guardrail or unconfirmed>_ | _<Must / Should / Could / Unconfirmed — not provided>_ | _<notes and sources>_ |

<!-- id: objectives.business-goals -->

### Obiettivi di business (Se Applicabile)

_<Include when the initiative has a business outcome. If applicability is
unknown, retain this table with explicit gaps rather than inventing a goal or
omitting the section. Omit only when non-applicability is confirmed.>_

| Goal ID                        | Obiettivo di business | Success metric | Priority | Notes |
| ------------------------------ | --------------------- | -------------- | -------- | ----- |
| `objectives.business.item-001` | _<obiettivo>_         | _<metric or unconfirmed>_ | _<priorità confermata o Non confermata>_ | _<note e fonti>_ |

<!-- id: metrics -->

## Metriche di successo (Sempre)

<!-- id: metrics.outcome-kpis -->

### KPI di risultato (Se Applicabile)

_<KPIs that measure the product or business outcome and cannot be reduced to a
single JTBD.>_

| ID                     | KPI     | Valore iniziale | Obiettivo | Fonte         | Data di verifica | Responsabile |
| ---------------------- | ------- | ------------ | ---------- | --------------- | ----------- | --------- |
| `metrics.kpi.item-001` | _<KPI>_ | _<confirmed value and exact period, or unconfirmed>_ | _<confirmed target or Unconfirmed — not provided>_ | _<data source>_ | _<confirmed date/cadence; label proposals>_ | _<confirmed owner or Unassigned>_ |

<!-- id: metrics.quality-guardrails -->

### Guardrail qualitativi obbligatori (Se Applicabile)

_<Reliability, compliance, accessibility, support, or service-quality limits
that must not regress while pursuing the outcome.>_

| ID                           | Guardrail     | Soglia        | Fonte di misurazione | Responsabile |
| ---------------------------- | ------------- | ------------- | ------------------ | --------- |
| `metrics.guardrail.item-001` | _<source-grounded guardrail>_ | _<confirmed threshold or Unconfirmed — not provided>_ | _<source or unconfirmed>_ | _<confirmed owner or Unassigned>_ |

<!-- id: strategic-dependencies -->

## Dipendenze strategiche (Sempre)

_<Internal and external stakeholders, services, policies, or initiatives that
affect the opportunity, scope, priority, or feasibility.>_

| ID                      | Dipendenza o stakeholder  | Impatto    | Responsabile | Stato   |
| ----------------------- | ------------------------- | ---------- | --------- | ---------- |
| `dependencies.item-001` | _<dependency>_            | _<impact>_ | _<owner>_ | _<status>_ |

<!-- id: context-constraints -->

## Contesto e vincoli (Opzionale)

_<Include when relevant: market context, competitors, legal or regulatory
constraints, technical constraints, or other boundaries.>_

| ID                     | Area     | Contesto o vincolo    | Impatto    | Note      |
| ---------------------- | -------- | --------------------- | ---------- | --------- |
| `constraints.item-001` | _<area>_ | _<constraint>_        | _<impact>_ | _<notes>_ |

<!-- id: feasibility-red-flags -->

## Rischi iniziali di fattibilità (Opzionale)

_<Record preliminary risks that may require formal analysis. Do not present
preliminary opinions as formal feasibility approval.>_

| ID                   | Area                                                     | Red flag / rischio | Impatto     | Owner     | Azione richiesta |
| -------------------- | -------------------------------------------------------- | ------------------ | ----------- | --------- | ---------------- |
| `red-flags.item-001` | _<Legale / Privacy / Sicurezza / Tecnologia / Operazioni>_ | _<rischio>_      | _<impatto>_ | _<owner>_ | _<stato e prossima azione: Da affrontare / Affrontato / Mitigato / Accettato — dettaglio>_ |

<!-- id: design-discovery -->

## Esperienza e Service Blueprint (Se Applicabile)

_<Include when applicable, or write Not applicable with a confirmed reason.
Link or summarize the discovery design: frontstage touchpoints, backstage
processes, pain points, opportunities, and open UX assumptions.>_

| ID                          | Elemento esplorato | Riferimento o descrizione | Stato  |
| --------------------------- | -------------- | ------------------------ | ---------- |
| `design-discovery.item-001` | _<item>_       | _<sourced touchpoints only; do not infer backstage behavior or implementation>_ | _<confirmed, proposed, untested, or unknown>_ |

<!-- id: open-questions -->

## Questioni aperte, assunzioni e ipotesi (Opzionale)

_<Track only items that can affect scope, priority, outcome, or feasibility.
Include the impact of leaving each question unresolved in the Domanda / ipotesi
cell. Bloccante? refers to the next lifecycle transition being assessed: for
discovery, mark Sì only when the unresolved issue challenges the initiative's
core reason, intended users, or outcome; for later gates, mark Sì when the
issue prevents that gate. Use exactly Sì or No. Detailed edge cases and
implementation questions belong in downstream specifications.>_

| ID                        | Domanda / ipotesi | Bloccante? | Owner     | Decisione attesa entro | Esito / link |
| ------------------------- | ----------------- | ---------- | --------- | ---------------------- | ------------ |
| `open-questions.item-001` | _<domanda o ipotesi; impatto se irrisolta: ...>_ | _<Sì / No>_ | _<owner>_ | _<data>_ | _<TBD o risoluzione>_ |

<!-- id: support-readiness -->

## Preparazione di Supporto e Operazioni (Se Applicabile)

_<Include when applicable. Capture whether support or operations involvement,
knowledge-base material, runbooks, FAQs, or support tooling are needed. Keep
detailed operational procedures outside the PRD.>_

| ID                                 | Domanda di preparazione                       | Risposta                         | Note      |
| ---------------------------------- | --------------------------------------------- | -------------------------------- | --------- |
| `support-readiness.involvement`    | _<Serve il coinvolgimento di Supporto/Operazioni?>_ | _<Sì / No / Da valutare>_ | _<note>_ |
| `support-readiness.knowledge-base` | _<Servono materiali KB, FAQ o runbook?>_      | _<Sì / No / Non applicabile — motivo>_ | _<note>_ |
| `support-readiness.user-errors`    | _<Sono previsti errori utente rilevanti?>_    | _<Sì / No / Da valutare>_         | _<note>_ |
| `support-readiness.tools`          | _<Servono API o strumenti per il supporto?>_ | _<Sì / No / Non applicabile — motivo>_ | _<note>_ |
