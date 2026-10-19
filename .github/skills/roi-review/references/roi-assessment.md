# ROI Assessment

Reference for step 3 of the review workflow: what to collect, how to score value
and cost, and how calibrated verdicts read.

## Collect the inputs

```bash
# scope against the merge base, not a stale local file
git fetch origin main
git diff --stat "$(git merge-base origin/main HEAD)"...HEAD

# new runtime surface and dependencies
git diff "$(git merge-base origin/main HEAD)"...HEAD -- '**/package.json' '**/*.csproj' '**/go.mod'

# the claimed value
gh pr view <number> --json title,body,labels
```

Generated files, lockfiles and formatting-only churn are review cost, not design
cost. Exclude them from the numbers and say so.

## Value

Value is **frequency × blast radius × certainty**. A rare failure that destroys
remote state is worth fixing; a rare failure that git recovers in one command is
not; a failure nobody has reported is speculation.

| Question              | Weak value                       | Strong value                                 |
| --------------------- | -------------------------------- | -------------------------------------------- |
| Failure is documented | "could happen"                   | ticket, incident, reproduced bug             |
| Frequency             | once per repository, theoretical | every run, every generated project           |
| Blast radius          | recoverable local edit           | data loss, security, remote state, broken CI |
| Doing nothing costs   | inconvenience                    | a blocked workflow, recurring support        |
| Who benefits          | one contributor                  | every consumer of a module or command        |

## Cost

Cost is permanent; value is often one-off. Count:

- net lines of hand-written code and tests;
- runtime dependencies and their transitive tree;
- new branches, states and failure modes, each needing a test and a support
  answer;
- public surface: props, flags, commands, inputs, outputs, error messages;
- input shapes deliberately supported, each a branch forever;
- documentation and support answers the change creates.

## Report the ratio

One formula, two sentences: "<value, with frequency and blast radius>. <cost, in
lines, dependencies and supported cases>." Then the verdict. If the two sentences
need hedging, the verdict is probably "worth it with changes" or
"over-engineered", and the review should say which parts to drop.

## Calibration: worked examples

### Over-engineered: a parser and a concurrency protocol for one attribute

A CLI edits one attribute of a Terraform file it generates from a fixed template.
The change replaces a regular expression with a syntax-tree editor, adds a file
lock, inode identity checks and atomic replacement, and supports a matrix of
hand-edited shapes (escaped labels, quoted keys, BOM, CRLF, comments inside the
list).

- **Value:** real but narrow. The failure is a corrupted generated file, usually
  recoverable from git.
- **Cost:** ~1,400 net lines, three runtime dependencies, a permanent shape
  matrix, and a race that remains open after all the machinery.
- **20% version:** locate the block by scanning, edit the attribute, validate the
  candidate with the formatter the project already runs, then replace the file. A
  malformed edit never reaches disk, at a fraction of the size.

### Not worth it: an abstraction with one call site

A helper, interface and factory are introduced so a twenty-line operation can be
swapped later. No second implementation exists or is planned.

- **Value:** speculative.
- **Cost:** indirection every reader must follow, plus a second place to update
  when the real requirement changes.
- **Response:** keep the twenty lines inline; extract when the second call site
  arrives, with its shape known.
