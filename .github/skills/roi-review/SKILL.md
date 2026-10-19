---
name: roi-review
description: "Review a pull request for ROI: the value it delivers against the complexity it adds, then propose cheaper trade-offs. USE WHEN: reviewing a PR, branch or diff, drafting review comments, judging whether a design is over-engineered, or adding a value-versus-cost axis to a standards or spec review."
---

# ROI Review

A review answers one question before the rest: **is this change worth what it
costs?** A correct diff can still be the wrong change: general-purpose machinery
for a one-off need, robustness nothing runs, a second way to do what the
repository already does.

## Composition

ROI is one axis of a review, not the whole review. A standards review asks
whether the code follows the repository's rules, a spec review whether it
implements the issue, this skill whether it is worth its cost. When another
review skill is available, run it and report this axis separately; do not restate
findings it covers. Without one, step 4 carries the minimum.

## Workflow

### 1. Frame the review

Diff the merge base, not a stale local file, and separate hand-written code from
generated files and lockfiles so they do not inflate the cost. Read the PR body,
the linked ticket and the tests, then state the value claim in one sentence:
which failure does this remove, for whom, how often?

Done when the claim cites a ticket, a reproduced bug or a documented
requirement, and names who benefits and how often.

### 2. Price the change

Count what a maintainer must keep alive: net lines, dependencies, new states,
branches and failure modes, input shapes deliberately supported, public surface
(props, flags, commands, inputs), tests and docs. Cost is permanent; value is
often one-off.

Done when the cost is a number, not an adjective.

### 3. Decide the ROI

Apply five tests:

- **20% question** — can a fifth of the diff remove four fifths of the failure?
- **delete test** — would the author write this again knowing only the reported
  case?
- **scenario test** — for each defensive layer, name the scenario it protects;
  no scenario, no value.
- **upstream test** — does this repository own the template, generator or schema
  that creates the problem? Fixing it there is smaller.
- **novelty test** — does an existing helper, target, validator or pattern
  already do it?

Then pick a verdict:

| Verdict               | When                                      | Ask for                                |
| --------------------- | ----------------------------------------- | -------------------------------------- |
| Clear win             | cost proportional, no simpler option      | approve                                |
| Worth it with changes | value real, cost reducible                | the parts to drop or split, with lines |
| Over-engineered       | value real but machinery exceeds it       | the smaller design, with numbers       |
| Not worth it          | failure hypothetical or handled elsewhere | what to do instead                     |

Done when a verdict is named and the ratio fits two sentences. The rubrics and
worked examples are in [references/roi-assessment.md](./references/roi-assessment.md).

### 4. Read for correctness

Now the diff. Label every finding, cite `file:line`, and give a number where a
number exists. Check the documented rules the other axes leave out: PR format,
acceptance criteria, tests, documentation.

Done when every finding has evidence, and none restates what a formatter,
linter, type checker or CI check already enforces.

### 5. Name the cheaper version, then write

For each objection, name the smaller design that still solves the reported case,
using [references/low-complexity-tradeoffs.md](./references/low-complexity-tradeoffs.md):
existing tooling, narrower inputs, a gate instead of a validator, bounded
robustness, a follow-up instead of a framework.

Lead with the verdict and the ratio, then the detail:

```markdown
## Review: ROI

**Verdict: <clear win | worth it with changes | over-engineered | not worth it>.**
<2-3 sentences: the value, the cost in numbers, the ratio.>

### What is worth keeping

- <the part that solves the reported problem>

### Where the cost is not justified

1. **<name>.** <evidence: file:line, number> — <cheaper version>.

### What I would ask for

1. <request the author can close without asking what you mean>
```

Done when the author can act on every item without a follow-up question.

## Reading a review

- One finding per comment, labelled with the Conventional Comments the
  repository documents (`praise:`, `suggestion:`, `issue:`, `question:`,
  `nitpick:`, `thought:`).
- Every objection carries a cheaper version, or an explicit "I don't know a
  cheaper option, can we discuss?".
- Blocking findings first, options and follow-ups last.
- Existing threads: agree, contest with evidence, or extend them; a repeated
  finding is noise.
- A proportionate change gets one line and an approval.

## Posting

Post only when asked, and confirm the shape first: review body, inline comments
or both, and whether it is a comment or a request for changes. Keep the body
under a screen of text and move evidence into inline comments.

## References

- [ROI assessment](./references/roi-assessment.md): inputs to collect, value and
  cost rubrics, worked examples.
- [Low-complexity trade-offs](./references/low-complexity-tradeoffs.md): levers,
  examples, and when robustness is worth paying for.
- Repository review rules: `apps/website/docs/github/pull-requests/` (`index.md`,
  `format.md`, `code-review/index.md`, `code-review/conventional-comments.md`).
