---
name: prd-alchemist
description: Write and update a structured Product Requirements Document (PRD) in Italian unless the user explicitly requests another language. Use when a product manager wants to turn discovery notes, meeting summaries, strategy input, or product material into a Confluence-compatible PRD covering need definition, actors, canonical JTBD, success metrics, guardrails, dependencies, constraints, feasibility red flags, design discovery, open questions, and support readiness. Supports the PRD lifecycle (draft, discovery, evaluation, approved, execution, archived, and legacy review), validates stage-appropriate gate evidence before transitions, enforces Product and Design review sign-off for approval, preserves stable English IDs, reports validation outcomes, and offers optional Confluence publication.
---

# PRD Alchemist

Turn gathered product material into a structured, outcome-oriented Product
Requirements Document (PRD) using the applicable product requirements guidance.

The PRD defines the problem, affected users, intended outcomes, constraints, and
preliminary feasibility signals. It is outcome-oriented and does not replace
downstream solution design, use cases, technical
specifications, acceptance criteria, QA checklists, or implementation backlogs.

Product managers use the PRD to align sponsors, engineers, designers,
Legal/Compliance, Support/Operations, and delivery stakeholders across the full
initiative lifecycle.

## When to Use This Skill

Use this skill when the user wants to:

- turn gathered product material, strategy notes, or user research into a
  structured, Confluence-compatible PRD;
- rewrite or update an existing PRD using the structure in
  [`templates/prd.md`](./templates/prd.md);
- manage lifecycle transitions across `draft`, `discovery`, `evaluation`,
  `approved`, `execution`, `archived`, or legacy `review`;
- validate stage-appropriate gate entry evidence before changing status;
- fill gaps through a targeted, non-inventive clarification interview;
- prepare a validated PRD for handoff to `confluence-librarian`.

The preferred input is the output of a gathering phase plus any strategic
documents, notes, links, or decisions available. If the user starts with less,
ask for the missing information rather than inventing it.

## Output Contract

Produce one PRD using [`templates/prd.md`](./templates/prd.md). Write it to the
path requested by the user, or to `prd.md` in the current working directory when
no path is given. Never overwrite the bundled
template.

- Write every new or updated PRD in Italian unless the user explicitly requests
  another language. The language of the prompt, source documents, or existing
  PRD does not override this default. Apply the chosen language to the title,
  visible headings, prose, and explanatory cell content.
- Keep the five standardized table headers in the template unchanged, even if
  the user requests another PRD language.
- Keep lifecycle status tokens in their canonical form for validation, while
  localizing all surrounding human-readable content.
- In an Italian PRD, express JTBD statements as
  “Quando [situazione], voglio [obiettivo], così posso [risultato atteso]” and
  use exactly `Sì` or `No` in the open-question blocker cell. Use `Yes` or
  `No` if the user explicitly requests an English PRD.
- Treat the suffixes `(Sempre)`, `(Se Applicabile)`, and `(Opzionale)` in
  template headings as author-only requirement labels. Include every `(Sempre)`
  section in the final PRD. Include `(Se Applicabile)` sections when relevant;
  omit them only when confirmed not applicable, unless a requested lifecycle
  gate requires an explicit assessment. Include `(Opzionale)` sections only
  when useful or required by the requested gate. Remove these suffixes from
  every final heading; they must not appear in the PRD.
- Unknown applicability is not confirmed non-applicability. Keep a conditional
  section with explicit gaps when its applicability has not been assessed,
  including business goals when no distinct business outcome was supplied.
  Do not invent a goal or justify omission solely by the absence of input.
- Lifecycle-gate evidence requirements still apply: if a requested gate needs
  content from a conditional or optional section, include that section with
  supported evidence or an explicit gap/N/A rationale. Do not infer evidence
  from its classification label.
- Include the visible `Metadati` section from the template. Status defaults to
  `draft` for new documents. A normal update must preserve the current status.
- Preserve every stable section comment (`<!-- id: ... -->`) and field ID
  (`metadata.*`, `objectives.*`, etc.) exactly as written. IDs are always English
  and are never translated, even if visible headings are translated.
- Include every section marked `(Sempre)`. For other sections, follow the
  classification and lifecycle-gate rules above. When omitting a section,
  remove its section anchor and contents together; retain all anchors and field
  IDs in sections included in the PRD.
- Preserve the template schemas for its Persona, Business Goals, User Goals,
  Risks, and Open Questions tables. Do not add or remove columns or rename their
  column titles, even when the user requests a language other than Italian; put
  any additional detail inside the existing cells.
- Keep concrete facts traceable through source titles/keys and links, not opaque
  source codes alone.
- Run the deterministic validator and summarize its result, blockers, and
  unresolved gaps in the response. Distinguish checks the script can verify
  from evidence that needs human judgment.
- Assess only the current status unless the user requests a transition or
  explicitly asks about readiness for another status. Do not claim that an
  unassessed future gate would pass or fail based on gaps for a different
  stage. When a future gate is requested for assessment, run the validator
  with that `--target-status` and summarize the target, invocation, and result
  in the response.
- Do not advance lifecycle status without an explicit user request and gate
  validation. Do not claim human acceptance. Do not create downstream use
  cases, architecture, or backlog items.
- For a blocked transition, end the response with an explicit opt-in question:
  “Vuoi fornire le evidenze mancanti per rivalutare il passaggio?” (or
  “Would you like to provide the missing evidence to reassess the transition?”
  for an English response). A gap list or “Please provide…” is not an opt-in
  question. If interactive questioning is unavailable, include the question
  in the final response rather than omitting it.

## PRD Writing Style

Write narrative PRD prose with an explicit subject so readers can identify who
experiences a need, performs an action, owns a decision, measures an outcome, or
enforces a constraint.

- Name the relevant product user, actor, owner, stakeholder, or system.
  Distinguish product users from the Copilot interlocutor; attribute a team role
  or decision only when the source establishes it.
- Replace impersonal or subjectless phrases such as “it is necessary,” “it was
  decided,” “should be monitored,” or standalone infinitive instructions with a
  sentence that names the confirmed subject.
- When the source does not identify the subject, preserve the gap as a targeted
  open question. Do not invent an actor merely to complete the sentence.
- Apply this rule to narrative sentences in the PRD. Headings, stable IDs,
  metadata values, and intentionally compact table cells may remain fragments.
- State product needs and agreed scope directly. Keep necessary attribution
  with the decision or evidence, not as repeated accounts of chat confirmations.
  Retain material uncertainty without repeating the same caveat.

## Evidence Fidelity

Treat source evidence as a boundary, not a prompt to complete a plausible
story. Keep each material claim, owner, priority, metric value, time period,
and decision traceable to the supplied material. Preserve whether a statement
is confirmed, proposed, unapproved, or unknown.

- Do not infer a priority, accountable owner, metric target or threshold,
  measurement cadence, approval, or release decision. Use an explicit
  `Non confermato — non fornito` or `Non assegnato — non identificato` value in a
  draft when the source is silent. A later lifecycle gate may require that
  field to be resolved.
- A team named as a source, contributor, or data provider is not necessarily
  the accountable owner or decision-maker. In the Open Questions `Owner` cell,
  record only an explicitly assigned decision/follow-up owner, or an explicit
  unknown owner. Do not assign or propose a source's author as the follow-up
  owner. Mention the source author in the question or notes instead, and ask
  who must decide when authority is unknown.
- Distinguish an action's completion from whether it was requested. A review
  that is not completed does not establish that it was not requested; use
  `Non valutato — stato della richiesta sconosciuto` unless a
  source explicitly states the request status. Apply this to Legal/Privacy,
  Engineering, and other review or feasibility fields.
- Preserve the exact reporting window attached to a measurement. A count for
  one month is evidence for that period, not a recurring average, trend, or
  forecast. A proposed review cadence remains a proposal until approved.
- Keep qualitative outcomes qualitative. Do not convert “keep records
  accurate” into an invented `100%` or “zero duplicates” threshold. Record the
  threshold as unconfirmed and ask the accountable owner when it is needed for
  the requested lifecycle gate.
- Summarize design discovery only to the user touchpoints and behaviors
  actually described by the sources. Do not invent backstage steps, slot
  release or synchronization behavior, APIs, support tools, or runbooks.
  Record a useful but unverified implication as an explicitly labeled
  hypothesis or open question, not as a confirmed design or requirement.
- Do not assign `Obbligatorio`, `Raccomandato`, or `Facoltativo` unless a
  source or explicit user decision sets the priority. Keep an unknown priority
  explicit in a draft; block a later gate if that gate requires a confirmed
  priority.

## Lifecycle and Gate Rules

```
[draft] ──> [discovery] ──> [evaluation] ──> [approved] ──> [execution]
   │             │               │              │              │
   └─────────────┴───────────────┴──────────────┴──────────────┴────> [archived]
```

Detailed gate definitions are documented in
[`references/lifecycle-and-gates.md`](./references/lifecycle-and-gates.md).

### Status Change Rules

1. **Explicit request required**: A status change must be prompted by an
   explicit user request (e.g., *“move to evaluation”*, *“mark as approved”*). A
   normal content update must preserve the current status.
2. **Validate assertions vs shortcuts**: When the user asks to move to a given
   state or asserts that the PRD is approved, validate the requested state
   against the stage-appropriate entry evidence rather than treating the
   assertion as a shortcut.
3. **Handle missing evidence safely**: If any required entry evidence is
   missing:
   - **Keep the current state.**
   - **Report exactly what evidence is missing.**
   - **Ask whether the user wants to provide the missing information.**
   - **Revalidate** after receiving information.
4. **Mandatory Product + Design review for approval**: A PRD cannot enter
   `approved` status without explicit sign-off evidence recorded for both
   Product review (`metadata.product-review`) and Design review
   (`metadata.design-review`).
5. **Review evidence vs artifact links**: A link to a Design Review artifact
   (such as `artifacts.design-review` or a Figma link) does **NOT** constitute
   review approval evidence.
6. **Validate the original transition**: Record the PRD's current status before
   editing. Validate with both `--from-status <original>` and
   `--target-status <requested>` while `metadata.status` still contains the
   original status. Change `metadata.status` only after that validation passes.
   The validator accepts a document already set to the target only when the
   original source status is supplied and the stored status matches that source
   or target.
7. **Assess the blocker for the requested transition**: The Open Questions
   table has one `Bloccante?` value. For discovery, mark `Sì` only when the
   unresolved issue challenges the initiative's core intent; for a later gate,
   mark `Sì` when it prevents that gate. Include the question and its impact in
   `Domanda / ipotesi`; put only an exact binary value in `Bloccante?`:
   `Sì`/`No` for Italian or `Yes`/`No` for an explicitly requested English PRD.
   `No — <explanation>` is not a valid value. Unknown values block the
   relevant gate.

### Summary of Stage-Appropriate Gate Evidence

| State | Required Entry Evidence |
| ----- | ----------------------- |
| `draft` | Initial problem signals. Gaps recorded as open questions or justified N/A. |
| `discovery` | Need definition present; confirmed sponsor and Product owner; initial actors identified; initial goals drafted; no blocking contradictions in intent. |
| `evaluation` / `review` | Canonical JTBDs with complete outcomes, metrics, guardrails, and priorities; KPI and quality-guardrail values/owners; strategic dependencies, scope boundaries, and constraints; feasibility survey across Legal/Compliance, Privacy, Security, Technology, and Operations with owners/actions; design discovery or justified N/A; all support-readiness questions assessed; every open question has impact, owner, and expected decision date. |
| `approved` | Product and Design sign-off evidence (reviewer, role, and date); explicit proceed decision; linked or explicitly planned Design Review and available Epic/board; confirmed target and priority; zero blocking open questions; feasibility red flags addressed, mitigated, or formally accepted with owners; outcome metrics and guardrails confirmed with owners; scope boundaries confirmed. |
| `execution` | Prior `approved` state and its evidence confirmed; linked and aligned solution design; available Epic/board; Product and delivery team kickoff/alignment evidence. |
| `archived` | Explicit user request, closure decision with owner/date and confirmed rationale (`completata`, `sostituita`, or `annullata`); include post-release observation evidence when the initiative shipped. |

The execution gate checks the solution-design reference and its explicit
`Collegato e allineato` status in addition to delivery-alignment evidence. The
validator checks the PRD's recorded fields; it cannot fetch or verify that an
external link is reachable or that a human's alignment claim is true.

### Safety Handlers

- **Repeated requests**: If the user repeats a promotion request without
  providing missing evidence, do not bypass the gate. Reiterate the exact
  missing evidence and keep the current status.
- **Invalid transitions**: Reject invalid sequence jumps (e.g., `draft` →
  `approved`), explain the canonical progression, and keep current status.
- **Unresolved contradictions**: Preserve competing positions in `Open questions`
  with impact and named decision owner; never resolve or invent facts.
- **Unknown ownership**: Flag missing owners as gaps/open questions; never
  invent names.
- **Legacy `review` documents**: On normal updates, keep `review`. Never
  silently rename. When transitioning, validate against the target state gate.

## Workflow

1. **Collect and trace inputs.** List the supplied evidence directory and read
   the records relevant to the requested gate, not just the named status
   summary. Carry complementary measurement, review, artifact, and decision
   records into the PRD before declaring gaps. Apply an explicit later
   resolution to earlier preliminary evidence while preserving its source.
   Bundled skill examples and eval fixtures are not project evidence; use only
   the user's supplied material. Attribute confirmed facts to sources.
2. **Map evidence to template.** Populate [`templates/prd.md`](./templates/prd.md)
   under stable section comments and IDs.
3. **Clarify selectively.** Ask targeted questions for contradictions, missing
   owners, or unclear problem statements. Do not block `draft` creation for
   conditional unknowns.
4. **Write or update the PRD.** Use outcome-oriented language with explicit
   subjects. Express user goals as canonical JTBD statements. Keep detailed use
   cases and technical architecture out of the PRD. Preserve the current
   `metadata.status` while preparing a requested transition. Check each named
   owner against the source's explicit assignment of that responsibility;
   replace inferred or author-proposed assignments with an unknown owner.
   Keep detailed use cases, implementation detail, and agent/session procedure
   out of the PRD. Retain technical constraints pertinent to product scope or
   feasibility and link supporting implementation evidence instead of retelling
   it.
5. **Run deterministic validation.** Run
   [`scripts/validate_prd.py`](./scripts/validate_prd.py) against the document.
   For an explicitly requested transition, pass the captured original state
   with `--from-status` and the requested state with `--target-status`.
   Correct authoring errors such as changed table headers, missing required
   sections, or damaged stable IDs using the template, then rerun validation
   before delivering. Formatting corrections do not require new source facts;
   unresolved evidence gaps still follow the requested gate's rules.
6. **Apply only a validated transition.** If all required gate checks pass,
   update `metadata.status` to the requested state and rerun the validator with
   the same source and target statuses. If any check is blocked or not
   validated, preserve the original status, summarize the missing evidence in
   the response, and ask whether the user wants to provide the needed input.
7. **Summarize the result.** State the PRD path, current status, validation
   result, and any blockers or unresolved gaps. For a blocked transition, end
   with the output contract's opt-in question. Do not imply human acceptance.
8. **Offer Confluence publication.** After writing a new PRD, ask:
   **"Do you want me to create a Confluence page for this PRD?"** If confirmed,
   hand off to `confluence-librarian`.

## Clarification Rules

- **Ask, never infer.** Do not turn a suggestion into a decision, create
  metrics, choose scope, assign ownership or priority, or resolve
  contradictions yourself.
- **Drafts may be incomplete.** Missing information belongs in open questions,
  assumptions, or a justified `Non applicabile` value. Do not invent a value to
  make the document look complete.
- **Change status only on explicit confirmation.** Keep current status unless
  the user explicitly requests a transition and gate criteria are met.
- **Preserve competing positions.** When sources disagree, state the
  contradiction in the clarification question and ask the decision owner to
  resolve it.

## Validation Script

The skill bundles [`scripts/validate_prd.py`](./scripts/validate_prd.py) for
deterministic completeness and gate checks:

```bash
python3 scripts/validate_prd.py <path-to-prd.md> \
  [--from-status <original-status>] [--target-status <requested-status>] [--json]
```

| Parameter | Required | Default | Description |
| --------- | -------- | ------- | ----------- |
| `file` | Yes | - | Path to the PRD Markdown file |
| `--from-status` | Yes for a transition | Current status | Original status captured before editing; requires `--target-status` |
| `--target-status` | No | Current status | Target gate to evaluate entry criteria against |
| `--json` | No | `false` | Output machine-readable JSON results |

The script validates structural completeness, stable IDs, and evidence markers.
It does not validate semantic truth or replace human reviews.
For a requested transition, preserve the original status while running the
validator and provide both transition statuses. Do not treat an updated
`metadata.status` alone as evidence that the transition sequence was valid.
If Python 3 or the bundled script cannot run, do not replace it with an ad hoc
check or claim a pass. State in the response that validation was not run and
why. Keep the current status for any requested promotion and request a working
validation environment.

## Boundaries

- Do not perform gathering-only aggregation when the user asks for a structured
  PRD.
- Do not advance lifecycle state without explicit user request and gate evidence.
- Do not fabricate reviewer sign-offs or human acceptance.
- Do not include detailed use cases, technical specifications, QA, rollout,
  backlog, or implementation content inside the PRD; keep those details in
  downstream artifacts instead.
- Do not publish to Confluence without explicit user confirmation.

## References

- [PRD Template](./templates/prd.md)
- [Lifecycle and Gate Model](./references/lifecycle-and-gates.md)
- [Validation Script](./scripts/validate_prd.py)
