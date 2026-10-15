# PRD Lifecycle and Gate Model

This reference defines lifecycle states, gate criteria, and transition safety
rules for PRDs produced with this skill.

## Lifecycle States

The supported PRD lifecycle comprises six sequential states:

```
[draft] ──> [discovery] ──> [evaluation] ──> [approved] ──> [execution]
   │             │               │              │              │
   └─────────────┴───────────────┴──────────────┴──────────────┴────> [archived]
```

Legacy documents may carry the baseline status `review`. This is treated as a
legacy status corresponding to the review/evaluation phase and handled with
specific safety rules (see below).

### 1. `draft`

- **Purpose**: Initial intake and continuous capture of product material,
  meeting notes, problem signals, and strategic intent.
- **Characteristics**: Permissive. Missing fields, partial information,
  unresolved ownership, and open questions are normal and expected.
- **Rule**: All newly created PRDs begin in `draft`. A normal update preserves
  `draft` unless an explicit transition is requested.

### 2. `discovery`

- **Purpose**: Active problem exploration, user research, persona definition,
  and initial discovery design.
- **Entry Gate Criteria**:
  1. `Need definition`: Confirmed user or business problem statement with an
     explicit context, without assuming a specific solution.
  2. `Metadata`: Confirmed `sponsor` and `owner` (neither is a placeholder or
     generic TBD).
  3. `Actors`: At least one confirmed persona or actor identified with defined
     behavior/needs.
  4. `Objectives`: Initial user goals or business goals drafted.
  5. `Blockers`: No unresolved fundamental contradictions in initiative intent.
     Assess the `Bloccante?` value against the requested transition. For
     discovery, mark `Sì` only when a question challenges the core initiative
     intent; for later gates, mark `Sì` when it prevents that gate.

### 3. `evaluation`

- **Purpose**: Rigorous product definition, feasibility analysis across all
  governance domains, and readiness for formal stakeholder review.
- **Entry Gate Criteria**:
  1. `Objectives`: User goals structured as canonical JTBD statements:
  *“Quando [situazione], voglio [obiettivo], così posso [risultato atteso]”*
     accompanied by expected outcome, success metric, quality guardrail,
     priority, and notes.
  2. `Success metrics`: Outcome KPIs (with baseline, target, data source, and
     review date) and Quality guardrails (with threshold, measurement source,
     and owner) defined or marked `Non applicabile — <motivazione confermata>`.
  3. `Dependencies & Constraints`: Strategic dependencies and context/constraints
     explicitly mapped.
  4. `Feasibility red flags`: Feasibility surveyed across all mandatory domains:
     Legal/Compliance, Privacy, Security, Technology, and Operations, each with
     an owner and next action.
  5. `Scope boundaries`: In-scope product outcomes and explicit out-of-scope
     non-goals recorded, or a justified N/A when a boundary is genuinely
     inapplicable.
  6. `Design discovery`: Design discovery and Service Blueprint touchpoints
     summarized, or marked `Non applicabile — <motivazione confermata>`.
  7. `Support readiness`: All four support readiness questions evaluated;
     unresolved `Da valutare` answers block the transition.
  8. `Open questions`: Every open question has an assigned owner, the impact
     of leaving it unresolved stated with the question, and an expected
     decision date.

### 4. `approved`

- **Purpose**: Confirmed product baseline ready for solution design and
  operational breakdown.
- **Entry Gate Criteria (STRICT)**:
  1. **Product review evidence**: Explicit sign-off recorded from the Product
     reviewer (name, role, approval date, and confirmation).
  2. **Design review evidence**: Explicit sign-off recorded from the Design
     reviewer (name, role, approval date, and confirmation).
  3. **Proceed decision and references**: An explicit proceed decision is
     recorded with its decision-maker, role, and date; the Design Review is
     linked or explicitly planned with an owner and target date; the Jira Epic
     and delivery board are available.
  4. **Confirmed planning inputs**: Target release and priority are confirmed.
  5. **Zero blocking open questions**: Zero items in `Open questions` marked
     `Bloccante? = Sì`, or with a missing/unknown blocker assessment.
  6. **Feasibility red flags addressed**: Each surveyed risk is addressed,
     mitigated, or formally accepted with a named owner and recorded
     disposition.
  7. **Metrics & Guardrails confirmed**: Outcome measures, baselines, targets,
     sources, review dates, thresholds, and operational owners are confirmed.
  8. **Scope stability**: In-scope outcomes and out-of-scope non-goals are
     confirmed without active contradictions.

> **CRITICAL DISTINCTION — Review Evidence vs Artifact Links**:
> A Design Review record under `artifacts.design-review` or a Figma link under
> `artifacts.figma` does **NOT** constitute Product or Design review approval
> evidence. Artifact references and human sign-offs are separate evidence.

### 5. `execution`

- **Purpose**: Active delivery, solution specification synchronization, and
  backlog execution.
- **Entry Gate Criteria**:
  1. Prior state: The PRD must already be in `approved` status (no skipping).
  2. Linked solution design: `artifacts.solution-design` identifies the
     solution-design artifact and explicitly records its alignment with the
     approved product baseline.
  3. Delivery references: The Epic and board are available for execution.
  4. Delivery alignment: Product and delivery teams record kickoff and
     operational-intake alignment with an owner and date.

### 6. `archived`

- **Purpose**: Initiative completata, annullata o sostituita.
- **Entry Gate Criteria**:
  1. Explicit user request requesting archival.
  2. Confirmed archival rationale: `completata`, `sostituita da <artefatto>`,
     or `annullata/abbandonata`, with a recorded decision owner and date.
  3. If the initiative shipped, link the post-release observation and record
     its measured outcome and observation date. If it did not ship, justify why
     no post-release observation applies.

---

## State Transition Rules and Safety Handlers

### Explicit Request Requirement

- A status change **must be prompted by an explicit user request** (e.g.,
  *“move to evaluation”*, *“mark as approved”*, *“the PRD is ready for review”*).
- A normal content update, rewrite, clarification, or addition **must preserve
  the current status**. Never advance or regress status autonomously.
- Before editing `metadata.status`, capture the original value and validate
  with `--from-status <original>` and `--target-status <requested>`. Apply the
  target only after the gate passes. A post-update validation must still include
  both values; a document's current status alone cannot prove the transition
  sequence.

### Validating Assertions vs Shortcuts

- When a user asserts a status or reports that an initiative has been approved
  (e.g., *“I have approved this PRD, change status to approved”*), the skill
  **validates the requested state against the stage-appropriate entry evidence**
  rather than treating the assertion as a shortcut.
- If required entry evidence is present, apply the status change.
- If any required entry evidence is missing:
  1. **Keep the current state.**
  2. **Report exactly what evidence is missing.**
  3. **Ask whether the user wants to provide the missing information to fill
     the gap.**
  4. **Revalidate** after receiving new information.

### Repeated Requests

If the user repeats a status promotion request without providing the missing
evidence, do not yield or bypass the gate. Reiterate the exact missing evidence
required for the gate, explain why the gate cannot be passed without it, and
keep the current status.

### Invalid or Unsupported Transitions

- Allowed forward sequence: `draft` → `discovery` → `evaluation` → `approved`
  → `execution`.
- Archival: Any active state → `archived`.
- Jumping over required intermediate states (e.g., `draft` → `approved` or
  `draft` → `execution`) is **invalid**.
- Transitioning out of `archived` without explicit unarchiving intent is
  **invalid**.
- When an invalid transition is requested: reject the transition, explain the
  canonical sequence, and keep the current status.

### Unresolved Contradictions

When sources or stakeholders present conflicting facts, metrics, scope, or
priorities:
- Never pick a winner or resolve the contradiction autonomously.
- Never invent missing facts to make the PRD appear consistent.
- Preserve the competing positions as an explicit entry in `Open questions,
  assumptions, and hypotheses`; state the impact of leaving the issue
  unresolved in the same question cell, and name the decision owner.
- Assess the single `Bloccante?` value against the transition currently being
  requested. Mark `Sì` for discovery only when the disagreement challenges the
  initiative's core reason, intended users, or outcome; for a later gate, mark
  `Sì` when it prevents that gate. A policy, feasibility, metric, or solution
  question may be `No` for discovery but `Sì` for approval. Do not infer the
  classification; an unknown value blocks the relevant gate.

### Unknown Ownership

- If an actor, owner, sponsor, or reviewer is unknown, do not invent one.
- Record the unknown ownership as an explicit gap in the respective field or as
  an open question.
- Missing required owners (e.g., sponsor or product owner for `discovery`, or
  reviewer sign-offs for `approved`) acts as a gate blocker.

### Legacy `review` Documents

- Existing PRDs created by earlier versions of the skill may have
  `metadata.status: review`.
- **Never silently rename status.** On a normal update, keep `review`.
- When the user asks to transition a legacy `review` document:
  - Treat `review` as equivalent to the evaluation/review gate.
  - Assess whether the document satisfies the `evaluation` or `approved`
    criteria based on the user's explicit target.
  - If the user asks to transition to `approved`, enforce the full `approved`
    gate (including Product + Design review sign-off and zero blockers).
---

## Reporting Gate Validation

Run `scripts/validate_prd.py` for structural and lifecycle checks. Summarize the
requested gate, validation result, and any blocking gaps in the response; do not
create separate validation or iteration files unless the user asks for them.
If Python 3 or the script cannot run, say validation was not run and why rather
than substituting a guessed result. A requested promotion remains at its
previous status until deterministic validation succeeds. Structural checks do
not establish semantic truth, external-link availability, or human approval.
Never describe a generated PRD as accepted unless the user explicitly accepts
it.

The single `Bloccante?` value is assessed for the requested gate. The validator
checks discovery intent only when assessing discovery; it does not reinterpret
a later gate's blocker as a contradiction in the initiative's original intent.
Later gates still check the underlying need, sponsor, owner, actors, and goals.

---

## Traceability of Mixed Input Evidence

PRDs frequently combine diverse input sources: user interview notes, strategic
memos, chat transcripts, customer feedback, and preliminary technical opinions.
Maintain strict traceability:

1. **Source attribution**: Name the source in notes or source columns for
   confirmed facts (e.g., *“Payments funnel dashboard reviewed weekly”*).
2. **Canonical JTBD structure**: Every user goal must follow:
   - Persona: specific identified actor.
   - Job statement: *“Quando [situazione], voglio [obiettivo], così posso [risultato atteso]”*.
   - Expected outcome: measurable business/user result.
   - Success metric: concrete indicator.
   - Quality guardrail: boundary or standard that must not regress.
   - Priority: Obbligatorio / Raccomandato / Facoltativo.
   - Notes: source context or dependencies.
3. **Justified N/A**: When a conditional section or item does not apply, write
   `Non applicabile — <motivazione confermata>`. Never leave blank or silently omit.
4. **Repeatable validation**: Verify structural completeness and gate
   compliance deterministically using `scripts/validate_prd.py`.
