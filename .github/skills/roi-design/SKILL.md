---
name: roi-design
description: "Design a change around its ROI: price the value against the permanent cost before writing code, choose the smallest shape that solves the reported case, and hold that line while implementing. USE WHEN: turning a ticket, request or idea into a design, choosing between designs, adding an abstraction, dependency, flag or supported input shape, or judging whether a change is over-engineered."
---

# ROI Design

Most complexity is bought before the first line and paid for long after: an
abstraction for a future that never arrives, a parser for input this repository
generates, a second way to do what the repository already does. This skill prices
a change while it is still a design, and keeps the implementation to the shape
that earned it.

## When it runs

- **Before writing code** — a ticket, a request or a bug report becomes a
  design: steps 1–5, then step 6 as the code lands.
- **During implementation** — an abstraction, dependency, state, supported input
  or public flag appears: run step 6 before it goes in, and re-check step 3 when
  its answer is not obvious.
- **A design already on the table** — a plan in a ticket, a draft PR: the same
  steps on someone else's design, and the note from step 5 is the
  counter-proposal.

## 1. Frame the value claim

State the failure this removes in one sentence: what breaks today, for whom, how
often, how bad. Take it from the ticket, a reproduced bug, an incident or a
documented requirement. When no source exists, it is a hypothesis: go to **spike**
in step 3 instead of building.

Done when the claim names a source, a beneficiary, a frequency and a blast
radius.

## 2. Price the design

Count what a maintainer inherits, not what the author writes: net hand-written
lines and tests, runtime dependencies and their tree, new states, branches and
failure modes, input shapes deliberately supported, public surface (props, flags,
commands, inputs, outputs, messages), documentation and support answers. Leave
generated files, lockfiles and formatting churn out of the numbers and say so.
Value is paid once; cost is paid every time someone reads, changes or debugs the
code.

Done when the cost is a number, not an adjective.

## 3. Cut to the smallest design

Apply five tests to the sketch, before it becomes code:

- **20% question** — can a fifth of the design remove four fifths of the failure?
- **delete test** — knowing only the reported case, would the author design this
  again?
- **scenario test** — for each defensive layer, name the scenario it protects; no
  scenario, no layer.
- **upstream test** — does this repository own the template, generator or schema
  that creates the problem? Fixing it there is smaller.
- **novelty test** — does an existing helper, target, validator or pattern
  already do it?

Then choose the decision:

| Decision | When                                             | What you do                                                                    |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Build    | value real, cost proportional, no smaller option | the design as sketched                                                         |
| Cut      | value real, part of the cost optional            | the slice; list the rest as deferred, with the trigger that brings it back     |
| Spike    | value plausible but unproven                     | a timeboxed prototype with no production machinery; decide with what it proves |
| Skip     | failure hypothetical or handled elsewhere        | nothing: fix upstream, document a boundary, or leave it                        |

Done when the decision is named and the ratio fits two sentences. The rubrics and
worked examples are in [references/roi-assessment.md](./references/roi-assessment.md).

## 4. Write the boundary

Every design excludes something. What sinks a small design later is leaving the
exclusion implicit: the first case outside it arrives as a bug, and defending it
becomes a design. Write the boundary as one sentence a reader can test a case
against — "assumes one interactive run per checkout; concurrent runs are
last-writer-wins", "accepts the layout this generator writes; hand-edited files
are reformatted" — and put it beside the design.

Done when the boundary names a case someone could actually bring.

## 5. Record the design

One screen, in the PR description or as a ticket comment:

```markdown
## Design: <change>

**Value.** <failure removed, who, how often, blast radius>
**Cost.** <lines, dependencies, states, supported shapes, public surface>
**Decision: <build | cut | spike | skip>.** <the ratio in one sentence>
**Boundary.** <what this does not handle>
**Deferred.** <what waits, and the trigger that brings it back>
```

Update the note when a decision changes: a design note that no longer matches the
code is worse than none. A proportionate change gets two sentences and no more;
the note is a thinking tool, not a ceremony.

Done when someone who has not read the diff can say what was bought and at what
price.

## 6. Hold the line while building

Implementation is where a design quietly grows. Each new element answers one
question before it is written:

| New element               | Question that decides it                           |
| ------------------------- | -------------------------------------------------- |
| Abstraction or interface  | where is the second call site, now?                |
| Dependency                | what does it replace, and what does its tree add?  |
| Supported input shape     | who produces that shape?                           |
| Defensive branch or retry | which scenario in the value claim does it protect? |
| Flag, option or setting   | who sets the other value?                          |
| Locking or concurrency    | which processes genuinely overlap?                 |
| New public surface        | who consumes it, and is it promised?               |

No answer means no element: use the levers in
[references/low-complexity-tradeoffs.md](./references/low-complexity-tradeoffs.md).
When an answer changes the design, update the note from step 5.

Done when every element added after the design has an answer recorded in the note
or the PR.

## Composition

This skill decides the shape; it does not replace the checks that follow. A
standards skill asks whether the code follows the repository's rules, a spec skill
whether it implements the issue; this one asks whether the change is worth its
cost. Findings from the other axes can still cut a design — treat them as input to
step 3 rather than as a separate verdict.

## References

- [ROI assessment](./references/roi-assessment.md): inputs to collect, value and
  cost rubrics, worked design examples.
- [Low-complexity trade-offs](./references/low-complexity-tradeoffs.md): levers
  and the price of each.
- Repository principles: `apps/website/docs/github/pull-requests/index.md`
  (pragmatic minimalism) and `acceptance-criteria.md`.
