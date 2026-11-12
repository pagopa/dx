# Jira issue contract

## Portable fields

Project-specific Jira fields vary. Map these portable fields to the schema
discovered in [persistence.md](./persistence.md):

| Issue    | Required content                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Epic     | outcome-oriented summary; PRD and DR sources, plus applicable UCs; concise outcome body. Grouping, KPI, guardrail, risk and readiness remain in the review proposal and DR                                                     |
| Story    | exact actor-facing `As a [Actor], I want to [action], so that [Gain]` summary; one-sprint scope; parent Epic; UC Source; optional IDs-only AC Coverage                                                                          |
| Task     | concrete enabling outcome; one-sprint scope; parent Epic or Story; source contract/NFR/readiness/gap ID, `open.item-XX` for a spike, or the semantic error identifier for error handling; dependency and verification evidence |
| Bug      | observed defect and expected behavior; relevant UC or incident source; reproduction and verification evidence                                                                                                                  |
| Sub-task | tightly coupled parent work; parent relationship and reference to the parent for source context                                                                                                                             |

Descriptions may summarize source behavior, but the DR/SRS and Use Case remain
authoritative. Use meaningful source titles/keys in prose and link labels, not
opaque source codes alone. Attribute decisions to evidenced owners rather than
an inferred team; describe the work, not the agent's conversation or procedure.
Use [issue-template.md](./issue-template.md) for the `## Source` document list,
its source-selection guidance, one-hop selection, nested stable IDs, canonical
locators, `## AC Coverage`, and execution-field format. Apply its execution
contract to every dispatchable Story, Task, Bug and Sub-task: require Output,
binary slice-local Checks and Scope/non-goals, and block persistence if any are
missing.
Optional supplied Slice Scope IDs are preserved, never generated.

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
  owner, the source `open.item-XX`, and the outcome that unblocks dependents.
  Put the question under its owning DR document in the Source list.
- Use Case errors are defined on the child pages with semantic identifiers and
  no owner. The same identifier can appear in several Use Cases: create one
  error-handling Task per identifier, record the identifier in its traceability,
  and link the affected Stories. Never merge two different conditions.
  Put the error ID under each affected UC document in the Source list.
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

Unresolved open questions are not Definition of Ready blockers by themselves:
they are projected as spikes or recorded gaps. The blockers above are missing
source evidence, not open decisions.

Report each blocker with its source, impact, and required resolution. Do not
replace it with a guessed Jira value.

## Persistence mechanics

Synchronization matching, field-level updates, confirmation, creation order,
native and remote links, and verification live in
[persistence.md](./persistence.md). This contract defines what an item must
contain; that reference defines how it reaches Jira.
