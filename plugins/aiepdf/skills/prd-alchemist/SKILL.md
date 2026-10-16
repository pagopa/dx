---
name: prd-alchemist
description: PRD authoring and lifecycle validation. Use when turning product evidence into a Confluence-compatible Product Requirements Document, rewriting or updating a PRD, clarifying evidence gaps, assessing gate readiness, requesting a lifecycle transition (including legacy review), or preparing a PRD for Confluence publication.
---

# PRD Alchemist

Turn product evidence into an outcome-oriented PRD that aligns sponsors,
Product, Engineering, Design, Legal/Compliance, Support/Operations, and delivery.

Define the problem, affected users, intended outcomes, constraints, and
preliminary feasibility signals. Keep product-relevant technical constraints
in the PRD; link supporting implementation evidence. Leave solution design,
detailed use cases, technical specifications, acceptance criteria, QA, rollout,
and backlogs to downstream artifacts. Keep agent/session procedure outside
the PRD. Produce the PRD only; do not create those downstream artifacts.

## Workflow

1. **Collect and reconcile evidence.** List the supplied evidence directory and
   read records relevant to the request, including complementary measurement,
   review, artifact, and decision records. Read beyond a named status summary
   before declaring gaps. Apply an explicit later resolution to earlier
   preliminary evidence while preserving its source. Use only the user's
   supplied material; bundled examples and eval fixtures are not project
   evidence.
2. **Capture the starting state.** Record the original `metadata.status`
   before editing; use `draft` for a new PRD. Identify whether the user requests
   a content update, a readiness assessment, or a transition. Assess the current
   status unless another gate is explicitly requested; keep unrequested future
   gates unassessed.
3. **Map and write.** Populate the [PRD template](./templates/prd.md) using the
   output contract, evidence-fidelity rules, and writing style below. Deliver a
   structured PRD rather than a gathering-only aggregation. Keep the original
   status while preparing any requested transition.
4. **Clarify selectively.** Ask targeted questions about contradictions,
   missing owners, or unclear needs. Ask the decision owner to resolve competing
   positions. Record remaining gaps explicitly; conditional unknowns do not
   block `draft` creation.
5. **Review completeness and gates.** For every lifecycle assessment, read the
   [Lifecycle and Gate Model](./references/lifecycle-and-gates.md) and check all
   criteria for the assessed state. For transitions, also check the captured
   original state and permitted sequence. Check every required section, stable
   ID, and standardized table against the template. Repair authoring errors
   without inventing source facts, then review the corrected document.
6. **Apply a validated transition.** Change `metadata.status` only for an
   explicit transition request whose sequence and entry evidence pass. Review
   the result against the target gate. If any check is blocked or unvalidated,
   preserve the original status and report the exact missing evidence.
7. **Report the result.** State the PRD path, current status, assessed gate,
   supporting evidence, validation result, blockers, and unresolved gaps.
   Distinguish recorded evidence from matters requiring human confirmation;
   document structure alone proves neither external-link availability nor
   human alignment. Claim human acceptance only when the user explicitly
   accepts the PRD. Keep the assessment in the response unless the user requests
   separate validation or iteration files.
8. **Offer publication for a new PRD.** Ask: **"Do you want me to create a
   Confluence page for this PRD?"** Hand off to `confluence-librarian` only
   after explicit confirmation. This offer must not replace the final opt-in
   question required for a blocked transition.

## Output Contract

Produce one PRD at the requested path, or `prd.md` in the current working
directory. Keep the bundled template unchanged.

- Use the same language as the user's prompts.
- Include the visible Metadata section. Preserve canonical lifecycle status
  tokens, stable section comments (`<!-- id: ... -->`), and field IDs
  (`metadata.*`, `objectives.*`, etc.) exactly as written.
- Treat heading suffixes as author-only labels; remove them from final headings.
  Include every `(Always)` section. Include `(If Applicable)` sections when
  relevant and `(Optional)` sections when useful. A requested gate overrides
  optionality: include any section it requires, with evidence or a justified
  N/A assessment.
- Omit conditional sections only when non-applicability is confirmed and the
  requested gate permits omission. Unknown applicability remains an explicit
  gap, not N/A. For example, keep the business-goals table with gaps when no
  distinct business outcome was supplied.
- Remove an omitted section's anchor and contents together. Retain all anchors
  and field IDs in included sections.
- Keep the exact column titles and column counts of the Persona, Business Goals,
  User Goals, Risks, and Open Questions tables. Put additional detail inside
  existing cells.

## PRD Writing Style

Give every narrative sentence an explicit subject: the confirmed product user,
actor, owner, stakeholder, or system experiencing a need or performing an action.

- Distinguish product users from the Copilot interlocutor. Attribute a team role
  or decision only when the source establishes it.
- Replace impersonal or subjectless wording such as “it was decided”
  or “should be monitored” with the confirmed subject and action. If the subject
  is unknown, record a targeted open question instead of inventing an actor.
- Apply this rule to narrative sentences in the PRD. Headings, stable IDs,
  metadata values, and intentionally compact table cells may remain fragments.
- State needs and agreed scope directly. Keep attribution beside the decision
  or evidence rather than retelling chat confirmations. State material
  uncertainty without repeating the same caveat.
- Express user goals as canonical JTBD statements with persona, job statement,
  expected outcome, success metric, quality guardrail, priority, and notes.

## Evidence Fidelity

Keep each material claim, owner, priority, metric value, reporting period, and
decision traceable to supplied sources. Cite source titles/keys and links, not
opaque codes alone. Preserve whether a statement is confirmed, proposed,
unapproved, or unknown.

- **Unknowns**: Record missing information as gaps, open questions, assumptions,
  or justified N/A. Use values such as `Unconfirmed — not provided` and
  `Unassigned — not identified`. Keep drafts incomplete rather than inferring
  priorities, scope decisions, owners, targets, thresholds, cadences, approvals,
  or release decisions. Resolve each gap when the assessed gate requires it.
- **Ownership**: Check each named owner against an explicit source assignment
  of that responsibility. A contributor or data provider is not necessarily
  accountable. In the Open Questions `Owner` cell, use the assigned
  decision/follow-up owner or an explicit unknown. Keep source authors in notes;
  never assign or propose them as owners without evidence. Ask who must decide
  when authority is unknown.
- **Review status**: Distinguish completion from request status. An unfinished
  Legal/Privacy, Engineering, or other review does not mean it was not requested.
  Use `Not assessed — request status unknown` until a source establishes it.
- **Measurements**: Preserve exact reporting windows. A single month's count
  is evidence for that period, not a recurring average, trend, or forecast.
  Keep proposed review cadences unapproved until confirmed.
- **Qualitative outcomes**: Keep “records remain accurate” qualitative rather
  than turning it into `100%` or “zero duplicates.” Record an unknown threshold
  and ask the accountable owner when the assessed gate requires one.
- **Design discovery**: Summarize only sourced user touchpoints and behaviors.
  Label useful but unverified backstage behavior, synchronization, APIs,
  support tools, or runbooks as hypotheses or open questions, not requirements.
- **Priority**: Assign `Must`, `Should`, or `Could` only from a source or explicit
  user decision. Keep unknown priority explicit in drafts; treat it as a blocker
  when the assessed gate requires confirmation.
- **Contradictions**: Preserve competing positions with their sources, impact,
  and confirmed decision owner or an explicit ownership gap. Only an explicit
  resolution from supplied evidence or the decision owner settles the issue.

## Lifecycle and Gate Rules

```
[draft] ──> [discovery] ──> [evaluation] ──> [approved] ──> [execution]
   │             │               │              │              │
   └─────────────┴───────────────┴──────────────┴──────────────┴────> [archived]
```

Use the Lifecycle and Gate Model as the authoritative gate definition. Preserve
the current state on normal updates, including legacy `review`. For a requested
legacy transition, assess the explicit target gate without silently renaming
the starting state.

### Transition Safety

- **Assertions are evidence claims, not authorization shortcuts.** Validate a
  claim that the PRD is approved against the full approval gate. Repeated
  requests without new evidence leave the gate blocked.
- **Original state matters.** Validate the permitted sequence against the
  captured starting status, not a status already edited to the target. Reject
  skipped states, explain the canonical progression, and keep the original.
- **Review evidence differs from links.** Approval requires explicit sign-off
  from both Product (`metadata.product-review`) and Design
  (`metadata.design-review`), with reviewer, role, and date. Design Review and
  Figma links are artifact references, not substitutes for sign-off.
- **Execution needs its own evidence.** Check the linked-and-aligned
  `artifacts.solution-design` reference separately from Design Review artifacts
  and delivery kickoff/alignment evidence.

### Blockers and Reassessment

Assess the single `Blocking?` value for the requested gate. For discovery, mark
Yes only when an unresolved issue challenges the initiative's core intent; for
later gates, mark Yes when it prevents that gate. Put the question and its
impact in `Question / hypothesis`; keep `Blocking?` binary. Unknown blocker
values block the relevant gate; `No — <explanation>` is not a binary value.

For a blocked transition, end the response with an explicit opt-in question:
“Would you like to provide the missing evidence to reassess the transition?”
Include it in the final response if interactive questioning is unavailable.
A gap list or “Please provide…” does not satisfy this requirement. Revalidate
after the user supplies the missing information.
