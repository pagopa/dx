# Jira persistence

Turn a confirmed Jira item or backlog projection into
Jira state. The content contract is in
[issue-contract.md](./issue-contract.md); backlog planning and workflow are in
[SKILL.md](../SKILL.md). Apply this reference to a whole backlog or to one item.

## Integration selection

Use the authenticated Atlassian MCP integration.

## Target project discovery

Inspect the target Jira project's available issue types and required fields and
issue-link types before assuming that Epic, Story, Task, parent, links, labels,
or custom fields are supported. Map the portable fields in
[issue-contract.md](./issue-contract.md) to the project's actual schema. Ask
when a required field or issue-link type is missing rather than guessing.

## Creation order and hierarchy

Create parent issues before children and prerequisite issues before dependents,
following the hierarchy and dependency rules in
[issue-contract.md](./issue-contract.md).

## Dependency and remote links

Create a confirmed dependency link only after both linked issues exist. Use the
project's supported link type and the direction specified by the contract.

Each confirmed item with a `## Source` must have one native remote link per
Confluence or Figma document in that section, titled with the document title.
Check existing links before adding one; match Confluence pages by page ID,
not a title slug or an ID fragment. Preserve distinct Figma node targets. Do
not duplicate links on synchronization. Remote links mirror the description's
authoritative Source list, not a second independently selected inventory.
Do not delete unrelated existing remote links unless their removal is
explicitly confirmed.

## Confirmation protocol

Before any mutation, state the project, operation, item count, hierarchy,
material field changes, and any unresolved non-blocking gaps. A request to
"prepare", "draft", or "show" is not confirmation. One confirmation covers the
confirmed batch, or the single confirmed item in single-item mode.

## Synchronization matching

Match an existing issue before creating a new one. Use the first unambiguous
match:

1. explicitly supplied Jira key;
2. stored Jira URL or confirmed source-to-item mapping;
3. source-document locators plus document-scoped IDs in `Source` and AC
   Coverage within the target project; confirm that the candidate's scope
   matches the item;
4. no match: propose creation;
5. multiple matches: stop and ask the user to choose.

Compare page IDs/canonical file locators and document-scoped IDs, not bare
`AC-01` across UCs or the shared DR alone. Several legitimate slices may share
the same source documents or UC: use confirmed scope/coverage or a supplied
correlation key to disambiguate; never merge slices just because their
references overlap.
For legacy Source lines, require an unambiguous mapping rather than silently
rewriting or duplicating the issue. Spike matching includes `open.item-XX`.
Error Tasks are shared by semantic error identifier within the projection;
extend their affected UC references rather than duplicating them.
Report ambiguous matches and stop.

## Field-level updates

Update only fields included in the confirmed diff. Preserve issue keys, an
existing item's parent Epic, unchanged acceptance IDs and unrelated Jira
content. Change status, assignee, priority or estimates only when explicitly
confirmed. Add a
new traceability ID only when the source introduces new meaning. Reformat a
legacy description only when explicitly confirmed.
Apply the [execution contract](./issue-template.md#execution-contract) without
silently expanding the update to repair unrelated legacy gaps.

## Verification

Re-fetch every created or updated item and verify:

- parent-child hierarchy and issue types;
- every confirmed dependency link, including direction and link type;
- issue content conforms to [issue-contract.md](./issue-contract.md), and
  execution details and source traceability conform to
  [issue-template.md](./issue-template.md);
- no duplicate issue was created, and error-task handling conforms to the
  contract;
- the returned Jira keys and URLs are usable;
- every Confluence or Figma Source document has exactly one remote link on
  the intended item, with the correct title and locator.

A failed verification makes the operation incomplete.

## Failure handling

Report partial failures explicitly. Never claim an item or backlog is
synchronized if a parent, child, link, or verification step failed. If the
destination or a match is ambiguous, ask rather than create a duplicate.
