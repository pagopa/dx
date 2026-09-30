# Delivery coverage validation

Run `validate-delivery-coverage` on every backlog projection before asking for
confirmation. The validation is read-only: it checks the proposed projection
against the selected Use Cases and reports blocking gaps and warnings without
creating or updating Jira items.

## Projection identity

Every dispatchable item, including each Epic, has:

- a canonical source ID or URL;
- a stable `Slice Scope ID`, unique inside that source;
- a `Projection Key` formed as `<canonical-source>::<slice-scope-id>`.

For Use Case work, use the stable Use Case ID as the canonical source, so its
projection keys start with `UC-XX::`. Use a contract, NFR, gap, incident, or
other stable source ID for work that does not implement a Use Case. Never use a
summary as identity.

Keep a projection key stable across synchronization. A changed summary or Jira
key does not create a new projection identity. A duplicate projection key is a
blocking ambiguity.

## Dispatchable item contract

Use this fixed description order:

```markdown
## Source

<resolvable canonical source link or stable ID>

## Slice Scope ID

<stable slice scope within the source>

## Output

<observable, non-empty result produced by this item>

## Checks

- <at least one item-local, binary verification>

## AC Coverage

- <AC ID only, when applicable>
```

`Output` is not a source link or an activity description. `Checks` validate the
item's own output; they do not claim that a Use Case acceptance check passed.
`AC Coverage` contains identifiers only and never copies acceptance-check text.
Omit `AC Coverage` when the item covers no Use Case acceptance check.

When `AC Coverage` is present, do not copy or paraphrase any domain outcome,
guardrail, error condition, numeric threshold, or Given/When/Then clause from
the canonical Use Case into `Checks`. Verify only the delivery artifact and its
evidence, for example:

- the artifact is versioned and linked;
- CI discovered and executed tests tagged with the listed AC IDs;
- the deployment or review evidence is attached;
- required schemas or dashboards are published and addressable.

Do not describe what those tests prove, what result the dashboard calculates,
or what user behavior occurs. Preserve that behavioral meaning only in the
canonical Use Case and list its IDs under `AC Coverage`.

An Epic normally uses the parent DR/SRS as `Source`, an outcome-oriented
`Slice Scope ID`, an `Output` describing the integrated capability, and a
binary `Check` that verifies the Epic's completion evidence. Omit `AC Coverage`
unless the Epic itself is the delivery slice for specific acceptance checks.

## Validation algorithm

For each proposed dispatchable item:

1. Resolve `Source` without ambiguity.
2. Verify that `Slice Scope ID` is present and stable inside the source.
3. Build the projection key and reject duplicates.
4. Verify that `Output` is present, non-empty, observable, and distinct from the
   source.
5. Verify that `Checks` contains at least one item-local binary check.
6. Verify that every `AC Coverage` entry exists in the referenced Use Case and
   contains only an ID.
7. When `AC Coverage` is present, compare `Checks` with the canonical
   acceptance checks and reject copied or paraphrased behavior, guardrails,
   errors, and thresholds.
8. Verify that every blocking dependency is resolvable and represented with the
   correct direction.

Then validate each selected Use Case:

1. Query the projection by the `UC-XX::` prefix.
2. Confirm that every in-scope acceptance-check ID appears in at least one
   proposed item's `AC Coverage`, or report an explicit justified gap with an
   owner.
3. Confirm that no proposed item introduces behavior absent from the canonical
   Use Case. Report such behavior as a gap instead of projecting it.
4. Confirm that acceptance-check work and delivery work remain distinguishable:
   item-local `Checks` verify a slice output, while `AC Coverage` only records
   the relationship to canonical acceptance checks.

## Evidence and result

Show the evidence used to derive the result. A status without these tables does
not demonstrate that validation ran.

First list every item:

| Projection Key | Required sections | Source resolved | Checks local | AC IDs valid | Dependencies resolved | Result |
| -------------- | ----------------- | --------------- | ------------ | ------------ | --------------------- | ------ |

Then list every selected Use Case prefix:

| UC prefix | In-scope AC IDs | Covered AC IDs | Owned gaps | Behavior drift | Result |
| --------- | --------------- | -------------- | ---------- | -------------- | ------ |

Use exact IDs in both tables. Do not replace the item rows with an aggregate
count, and do not claim `PASS` or `PASS_WITH_WARNINGS` when any item row or Use
Case prefix is `FAIL`.

Return:

- `PASS` when there are no blocking gaps;
- `PASS_WITH_WARNINGS` when coverage is complete but consultative quality
  warnings remain;
- `FAIL` when source resolution, projection identity, required sections,
  dependency resolution, or Use Case coverage is incomplete.

List every gap with the projection key or Use Case prefix, impact, owner when
known, and required resolution. Never hide a gap behind a success-shaped
summary.
