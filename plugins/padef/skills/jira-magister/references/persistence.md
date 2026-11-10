# Jira persistence

Turn a confirmed Jira item or backlog projection into
Jira state. The content contract is in
[issue-contract.md](./issue-contract.md); the planning, decomposition, and
readiness rules are in [SKILL.md](../SKILL.md). Apply this reference to a whole
backlog or to one item.

## Integration selection

Use the authenticated Atlassian MCP integration.

## Target project discovery

Inspect the target Jira project's available issue types and required fields and
issue-link types before assuming that Epic, Story, Task, parent, links, labels,
or custom fields are supported. Map the portable fields in
[issue-contract.md](./issue-contract.md) to the project's actual schema. Ask
when a required field or issue-link type is missing rather than guessing.

## Creation order and hierarchy

Create parents before children. Use the Epic parent relationship for Epic
membership, and use a Sub-task for tightly coupled work that does not need
independent prioritization. Create spike Tasks before the items they block.

## Dependency and remote links

Create a confirmed dependency link only after both linked issues exist. Use the
project's supported link type for `blocks` and preserve its direction: blocking
issue -> blocked issue. Create each spike's `blocks` link toward the dependent
Story or Task.

Each confirmed item must have one native remote link per Confluence or Figma
document in its `## Source`, titled with the document title. Check existing
links before adding one; match Confluence pages by page ID, not a title slug
or an ID fragment. Preserve distinct Figma node targets. Do not duplicate links
on synchronization. The description's Source list stays authoritative; remote
links mirror it, not a second independently selected inventory.

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

Update only fields included in the confirmed diff. Preserve issue keys, parent
Epic, unchanged acceptance IDs, existing status, and content outside the
confirmed change. Do not change lifecycle status, assignee, priority, estimates,
or unrelated description content unless the user confirmed those changes.
Preserve existing Jira content not owned by this projection. Add a new
traceability ID only when the source introduces new meaning. Reformat a legacy
description only when that change is explicitly included in the confirmed diff.

## Verification

Re-fetch every created or updated item and verify:

- parent-child hierarchy and issue types;
- every confirmed dependency link, including direction and link type;
- the parsed `Source` and AC Coverage lists match
  [issue-template.md](./issue-template.md): fixed key order, one document
  entry per locator, IDs under their owning documents, complete
  one-hop document set, and AC IDs linked to the owning UC;
- canonical locators, no bare file paths or pinned Confluence versions,
  and missing locators or unverified anchors reported honestly;
- Story acceptance checks and Task/Story classification;
- no duplicate was created, and no two error-handling Tasks share one semantic
  error identifier;
- every spike's `blocks` link exists in the correct direction;
- the returned Jira keys and URLs are usable;
- every Confluence or Figma Source document has exactly one remote link on
  the intended item, with the correct title and locator.

A failed verification makes the operation incomplete.

## Failure handling

Report partial failures explicitly. Never claim an item or backlog is
synchronized if a parent, child, link, or verification step failed. If the
destination or a match is ambiguous, ask rather than create a duplicate.
