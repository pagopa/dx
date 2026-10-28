# Jira persistence

Own the mechanics of turning a confirmed Jira item or backlog projection into
Jira state. The content contract is in
[issue-contract.md](./issue-contract.md); the planning, decomposition, and
readiness rules are in [SKILL.md](../SKILL.md). Apply this reference to a whole
backlog or to one item.

## Integration selection

Use the authenticated Atlassian MCP integration when available. If it is not
available, use the repository's `jira-cli` skill and follow its authentication
and command guidance; never silently switch tools.

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

After creating or updating each confirmed Jira item, use the Atlassian MCP
`addTeamworkGraphContext` relationship type
`jira-work-item-links-jira-work-item-remote-link` to attach each applicable
Confluence source page or Figma design artifact. Set the Jira issue as
`objectIdentifier`, the full source URL as `targetObjectIdentifier`, and the
page or artifact title as `title`. Keep the machine-readable source line in the
description as well.

## Confirmation protocol

Before any mutation, state the project, operation, item count, hierarchy,
material field changes, and any unresolved non-blocking gaps. A request to
"prepare", "draft", or "show" is not confirmation. One confirmation covers the
confirmed batch, or the single confirmed item in single-item mode.

## Synchronization matching

Match an existing issue before creating a new one. Use the first unambiguous
match:

1. explicitly supplied Jira key;
2. stored Jira URL or source mapping containing the stable source ID;
3. an exact stable-ID match in the target project;
4. no match: propose creation;
5. multiple matches: stop and ask the user to choose.

The stable source ID includes `open.item-XX` for spike Tasks and the semantic
error identifier for error-handling Tasks. Report ambiguity and stop instead of
creating a duplicate.

## Field-level updates

Update only fields included in the confirmed diff. Preserve issue keys, parent
Epic, unchanged acceptance IDs, existing status, and content outside the
confirmed change. Do not change lifecycle status, assignee, priority, estimates,
or unrelated description content unless the user confirmed those changes.
Preserve existing Jira content not owned by this projection. Add a new
traceability ID only when the source introduces new meaning.

## Verification

Re-fetch every created or updated item and verify:

- parent-child hierarchy and issue types;
- every confirmed dependency link, including direction and link type;
- source links and stable IDs;
- Story acceptance checks and Task/Story classification;
- no duplicate was created, and no two error-handling Tasks share one semantic
  error identifier;
- every spike's `blocks` link exists in the correct direction;
- the returned Jira keys and URLs are usable;
- every requested Confluence or Figma remote link is present on the intended
  Jira item; verify with Jira remote-link retrieval when graph-context traversal
  does not expose the relationship.

A failed verification makes the operation incomplete.

## Failure handling

Report partial failures explicitly. Never claim an item or backlog is
synchronized if a parent, child, link, or verification step failed. If the
destination or a match is ambiguous, ask rather than create a duplicate.
