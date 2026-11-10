# Jira issue contract

## Portable fields

Project-specific Jira fields vary. Map these portable fields to the schema
discovered in [persistence.md](./persistence.md):

| Issue | Required content |
| --- | --- |
| Epic | Outcome-oriented summary and concise outcome body; keep grouping, UC/JTBD, KPI, guardrail, risk and readiness in the review proposal and DR |
| Story | Exact actor-facing `As a [Actor], I want to [action], so that [Gain]` summary; one-sprint scope; parent Epic |
| Task | Concrete enabling outcome; one-sprint scope; parent Epic or Story; dependency and verification evidence |
| Bug | Observed defect and expected behavior; relevant UC or incident source; reproduction and verification evidence |
| Sub-task | Tightly coupled parent work; explicit scope and verification evidence |

Descriptions may summarize source behavior, but the DR/SRS and Use Case remain
authoritative. Use meaningful source titles/keys in prose and link labels, not
opaque source codes alone. Attribute decisions to evidenced owners rather than
an inferred team; describe the work, not the agent's conversation or procedure.
Use [issue-template.md](./issue-template.md) for the execution contract,
source selection, and source/acceptance-coverage formatting. Apply it to every
issue type above, while retaining that type's other required content.

## Stable identifiers

Preserve supplied JTBD, UC, AC, RFC, CR, DR/SRS `open.item-XX`, Use Case
`uc-open-XX`, and semantic error (`UPPER_SNAKE_CASE`) identifiers. Never renumber
or reuse an identifier for a different meaning.

## Sizing and decomposition

- An Epic groups related Stories and Tasks for one cohesive outcome and should
  finish in a few two-week sprints.
- A Story expresses actor value and should fit one two-week sprint.
- A Task is technical or enabling work and should fit one two-week sprint.
- A spike Task's deliverable is a decision; size it to one sprint and keep it
  independent so it can start immediately.
- Split work when it crosses actors, outcomes, acceptance boundaries, or sprint
  capacity. Flag the split for approval when the source does not define the
  boundary.

## Hierarchy and dependency links

Keep ownership hierarchy separate from delivery dependencies:

- Use the Epic parent relationship for Stories and Tasks that belong to the
  Epic. Do not represent Epic ownership with `blocks`.
- Use a Sub-task for an implementation step that is tightly coupled to one
  parent issue and does not need independent prioritization.
- Use `blocks` from an independent enabling Task to the Story or Task that
  cannot proceed without it. The dependent issue is then `is blocked by` that
  Task.
- A spike Task derived from a blocking `open.item-XX` uses the same `blocks`
  direction toward the dependent Story or Task.
- Use `blocks` between Stories or between Tasks only when the source identifies
  a real sequencing or delivery dependency.
- Do not create links for ordinary Epic membership, related context, or
  speculative dependencies.

Record each dependency as `blocking issue -> blocked issue -> link type`.
Creation-time mechanics live in [persistence.md](./persistence.md).

## Open questions, spikes, and error handling

- A DR/SRS open question with `Blocking: yes` becomes a spike Task; the items
  that cannot proceed `are blocked by` it. A non-blocking question stays a gap
  with its owner and creates no Task and no link.
- A spike's summary names the decision to take; its description carries the
  owner and the outcome that unblocks dependents.
- Use Case errors are defined on the child pages with semantic identifiers and
  no owner. The same identifier can appear in several Use Cases: create one
  error-handling Task per identifier and link the affected Stories. Never merge
  two different conditions.
- Route concrete Tasks to the repository in the DR/SRS `references.repository`.
  If the link is missing, record the gap and flag the unroutable Tasks instead
  of inventing a repository or a branch.

## Definition of Ready blockers

Block creation when any material item is missing or contradictory:

- PRD owner, outcome, JTBD, KPI, or qualitative guardrail;
- complete required DR/SRS sections;
- stable Use Case ID, priority/lifecycle context, or binary acceptance checks;
- relevant Figma/Service Blueprint, API/event/data contract, privacy, security,
  accessibility, tracking, support, or rollout evidence;
- accepted RFC propagation into the DR/SRS.

For each selected Use Case, require status `ready` on its child page and read
its `solution.components.*` and `contracts.*` references, domain entities, and
typed errors. Consume ready children without requiring the document review gate.

Unresolved open questions are not Definition of Ready blockers by themselves:
they are projected as spikes or recorded gaps. The blockers above are missing
source evidence, not open decisions.

Report each blocker with its source, impact, owner if known, and required
resolution. Do not replace it with a guessed Jira value.

## Single-item readiness

The full Definition of Ready gate does not apply to a prepared single item.
Validate that it is well formed and that no value is invented; ask for missing
content rather than filling it in.

## Persistence mechanics

Synchronization matching, field-level updates, confirmation, creation order,
native and remote links, and verification live in
[persistence.md](./persistence.md). This contract defines what an item must
contain; that reference defines how it reaches Jira.
