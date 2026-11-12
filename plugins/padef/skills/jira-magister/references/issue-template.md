# Jira source template

Use this structure in each proposed or confirmed issue description. The
top-level document bullets are the complete **source document inventory**.

```markdown
## Source

- prd: [PRD - Adhesion](https://example.atlassian.net/wiki/spaces/DEMO/pages/103)
  - [JTBD-01 - Join without a manual ticket](https://example.atlassian.net/wiki/spaces/DEMO/pages/103#JTBD-01)
- dr: [Design Review - Adhesion](https://example.atlassian.net/wiki/spaces/DEMO/pages/102)
  - [contracts.item-001 - Upload API](https://example.atlassian.net/wiki/spaces/DEMO/pages/102#contracts.item-001)
- uc: [UC-01 - Upload signed agreement](https://example.atlassian.net/wiki/spaces/DEMO/pages/101)
  - [AGREEMENT_EXTENSION_INVALID](https://example.atlassian.net/wiki/spaces/DEMO/pages/101#AGREEMENT_EXTENSION_INVALID)
- contract: [Upload API](https://github.com/example/adhesion/blob/main/api/openapi.yaml)

## Output

The upload endpoint validates the extension before attempting signature processing.

## Checks

- An endpoint test verifies that a disallowed extension never invokes the signature processor.

## Scope

- In scope: extension validation and its endpoint test.
- Out of scope: signature verification and agreement persistence.

## AC Coverage

- [AC-01](https://example.atlassian.net/wiki/spaces/DEMO/pages/101#AC-01)
```

The example URLs and IDs are illustrative, not documents to retrieve. Use the
execution contract below alongside the issue-type content requirements in
[issue-contract.md](./issue-contract.md).

## Execution contract

For new Stories, Tasks, Bugs and Sub-tasks, default to `Source`, optional
`Slice Scope ID`, `Output`, `Checks`, `Scope`, optional `AC Coverage`, in that
order. These headings are a readable default, not a universal Jira schema.
Respect an explicitly supplied approved project mapping if the same information
is explicit, nonempty and verifiable.

- **Output:** the observable result of this item, distinct from its source
  locator or an instruction to "implement the UC".
- **Checks:** binary checks of this item's deliverable. Propose them from the
  approved work, not new requirements. Reference evidence when supplied;
  never invent commands, test IDs, result links or a successful execution.
  For an integration slice, name the supplied implementation boundary and
  the collaborator interaction or response mapping being checked. For example,
  verify that an authorization result controls a downstream call and that its
  result maps to the response, rather than restating "the actor can download".
  Merely adding "integration" to an end-to-end AC does not make it slice-local.
- **Scope:** explicit authorized work and evidenced non-goals. Do not infer
  exclusions or use "TBD" to make a missing boundary appear complete.
- **Slice Scope ID:** optional; include and preserve it only when supplied or
  already present. Never generate one.
- **AC Coverage:** optional links to canonical AC IDs. Keep AC prose in the UC;
  coverage does not claim that a partial slice satisfies the full AC.

If required Output, Checks or Scope cannot be established from approved input,
show the gap, ask a focused question and block persistence. This applies even
in prepared-item mode. A locator or AC ID alone does not supply these values.

## Document keys and source selection

Write each document once as `- key: [meaningful title](locator)`. Use lowercase
keys in this fixed order for every item:

- `prd`: PRD owning JTBD or other product requirements.
- `dr`: operational DR/SRS owning solution, contract, NFR, or question IDs.
- `uc`: Use Case owning the behavior, errors, or acceptance checks.
- `contract`: concrete API, event, or data contract artifact.
- `figma`: applicable design, preferably a node-specific URL.
- `blueprint`: applicable Service Blueprint.
- `adr`: explicitly cited architecture decision.
- `rfc`: explicitly cited RFC, not an unpropagated substitute for the DR.
- `cr`: Change Request supplying the work.
- `incident`: incident supplying a Bug without a relevant UC.
- `intake`: self-contained intake or pending-spec source.

Use the fixed key order above for every item, regardless of issue type or source
relationships. Keep multiple documents with the same key in their source
order. Do not invent documents to fill the catalog.

Keys describe a document's role in this item, not a requirement for separate
pages. If the selected UC is a section of the DR, list the shared page once
as `uc`, label it with both DR and UC, and nest the UC section ID and other
cited DR IDs under it. Keep it in the fixed key order, and do not add a
duplicate `dr` bullet for the same page ID:

```markdown
## Source

- uc: [DR-04 - UC-02: Upload agreement](https://example.atlassian.net/wiki/spaces/DEMO/pages/104)
  - [UC-02](https://example.atlassian.net/wiki/spaces/DEMO/pages/104#UC-02)
  - [NFR-04](https://example.atlassian.net/wiki/spaces/DEMO/pages/104#NFR-04)
```

Use the supplied section ID or verified anchor; do not assign a UC ID to a
paragraph that has none. If several embedded UCs reuse a local AC ID and the
owning section cannot be distinguished by the supplied anchors, report that
locator ambiguity and ask for the published target rather than inventing a
qualified ID or fragment.

Select source documents based on the work and cited content, using issue type
as guidance rather than the sole criterion:

- Story or Task realizing a UC: `uc`.
- Task from DR/NFR/contract/readiness work, including a spike: `dr`.
- Error-handling Task: `uc`; include every UC that defines the shared error.
- Bug: the relevant `uc`, otherwise the supplied `incident`.
- Epic: `dr` only; keep grouping evidence outside its persisted body.
- CR or pending-spec work: `cr` or `intake`, when that is the actual source.

Single-item mode accepts a self-contained source without requiring an
unrelated DR. If a necessary source or locator is missing, ask for it; in a
review draft show `key: title - locator missing (gap)`. Do not invent a URL or
present an unresolved item as ready to persist.

## IDs and acceptance coverage

Nest each cited stable ID under its owning document. Start its label with the
exact ID, optionally followed by a short title. Examples include `JTBD-*`,
`NFR-*`, `solution.components.item-*`, `solution.decision.item-*`,
`contracts.item-*`, `open.item-*`, `uc-open-*`, semantic error IDs, and
ADR/RFC/CR IDs. Preserve the source's actual spelling; these examples do not
define or migrate an ID naming convention.

The UC identity is in its document label (and a nested section reference for
an embedded UC). Put acceptance-check IDs in
`## AC Coverage`, not among the nested Source IDs. Link each AC to its owning
UC, including when several UCs use the same local `AC-01`. Coverage contains
IDs only, not copied AC prose. Omit the section when no AC is covered; do not
invent coverage. Do not copy canonical acceptance-check prose elsewhere in the
issue body either.

## Select documents: one hop, no recursive collection

Derive this set separately for each item from the work it actually implements.
The UCs selected for the whole backlog, or the Stories that a Task unblocks,
are not automatically that Task's sources. In particular, contract-only wiring
uses the DR contract ID and artifact, not the consuming UCs or their AC/design
documents. Keep those delivery relationships in dependency links instead.

1. Include the associated DR/SRS. In backlog mode a missing DR is a readiness
   gap; self-contained incident/intake/single-item work need not have one.
   For an Epic, stop here: its Source contains only the DR.
2. Include every document owning a cited ID: selected UCs, PRD for JTBD, and
   ADR/RFC/CR only when explicitly cited.
3. Include the concrete artifact linked by each cited `contracts.item-*`,
   and the selected UCs' applicable, non-`N/A` Figma and Blueprint documents.
4. Stop there. Do not traverse arbitrary references, related PRD artifacts,
   links inside contracts, or reverse references. A contract-only Task gets
   `dr` plus `contract`, not every UC using that contract.
5. The application repository is a routing target, not a source document.
   A specific repository file can be a source document.

## Locators and fragments

- Confluence: use the canonical page-ID URL
  `https://<site>/wiki/spaces/<KEY>/pages/<pageId>`. A supplied title slug is
  tolerated; page ID is identity. Do not pin a revision.
- Confluence ID references: append `#<exact-source-ID>`. These are intended
  stable-ID anchors, **not verified navigation** unless the page publishes
  the matching anchor. Without it, the link may open only the page; report
  that limitation rather than claiming the section was reached. Do not
  fabricate heading-derived fragments or add anchors to source pages here.
- Repository file: use the supplied full GitHub blob URL on the known default
  branch. Resolve relative paths against the known document repository, which
  may differ from the application repository. Ask for unknown repository or
  branch context. Do not emit a bare basename, local filesystem path, or
  invented fragment. Render nested IDs as code text, e.g.
  ``- `contracts.item-001` - Upload API``.
- Other documents: keep the supplied canonical locator and verified anchors;
  do not invent fragments. Preserve Figma node targeting.
- For a repo-file AC, use `[AC-01](full-blob-URL)` without a fragment. The UC
  document identifies the owner even when the file has no navigable anchor.
- Use lists, not tables, for Source and AC Coverage.

Choose the nested-ID rendering from the **parent document's locator** first.
The `#<ID>` rule is for Confluence, not GitHub blob URLs. An unverified-anchor
warning does not make an invented repository fragment acceptable.

Repository-file source with a missing contract artifact:

```markdown
## Source

- dr: [Design Review - Adhesion](https://github.com/example/adhesion/blob/main/docs/design.md)
  - `contracts.item-001` - Upload API
  - `NFR-01` - Confidentiality
- contract: Upload API - locator missing (artifact URL not supplied)
```

Ask for that missing artifact URL before persistence; do not turn the DR file
into the contract locator.

## Other issue examples

These are source excerpts, not complete issues. Supply the remaining
issue-type content separately.

Contract-only Task:

```markdown
## Source

- dr: [DR - Adhesion](https://example.atlassian.net/wiki/spaces/DEMO/pages/102)
  - [contracts.item-001 - Upload API](https://example.atlassian.net/wiki/spaces/DEMO/pages/102#contracts.item-001)
- contract: [Upload API](https://github.com/example/adhesion/blob/main/api/openapi.yaml)
```

Spike: use the same `dr` bullet with an `open.item-007` child naming the
decision; include only its directly required source documents. State the owner,
decision outcome, and blocked items in the issue body.

Error Task or UC-backed Bug: use the Story example's `uc` bullet and semantic
error child, with the associated `dr`. Add other affected UC documents for a
shared error, without creating another error Task.

Incident-backed Bug:

```markdown
## Source

- incident: [INC-12 - Upload outage](https://example.org/incidents/12)
```

Sub-task: identify the parent and refer to it for source context; omit `Source`. Epic: use only `dr`; the review proposal, not its persisted body, retains the
included UC/JTBD grouping.
