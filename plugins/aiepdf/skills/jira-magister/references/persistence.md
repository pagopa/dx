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

Every confirmed backlog-mode Epic must have a remote link to its canonical
DR/SRS page. In single-item mode, require that link only when the supplied
source or item references a DR/SRS; a self-contained Epic does not require an
invented upstream document.
Other source links remain item-specific; where applicable, the Epic-to-DR/SRS
relationship is mandatory and is verified after persistence.

## Confirmation protocol

Before any mutation, state the project, operation, item count, hierarchy,
material field changes, delivery-coverage result, projection digest, and any
unresolved non-blocking gaps. A request to "prepare", "draft", or "show" is not
confirmation. Compute the digest using the complete manifest below, not a
summary or item count. One confirmation covers only the exact digest shown for the
confirmed batch, or the single confirmed item in single-item mode. Re-read the
canonical sources immediately before mutation; if their content or the
projection digest changed, invalidate the confirmation and return to review.

### Deterministic review manifest

Use schema `jira-projection-review/v1` in both backlog and single-item mode.
Capture the fully resolved operations before review; do not invent missing
field values to complete the manifest.

| Field            | Complete hash input                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`, `mode` | Schema above; `backlog` or `single-item`.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `target`         | Jira site, project ID/key, and the discovered field/link-type mappings used by the writes.                                                                                                                                                                                                                                                                                                                                                                     |
| `items`          | Object keyed by stable Projection Key. For each item include operation, matched Jira ID/key (or null for a create), complete API payload, and source IDs. Include every mutable field being written: type, summary, full description, parent, labels, assignee, priority, estimates, lifecycle changes, and all custom fields or clear/remove operations. Include the existing values used to build each update diff, including preserved description content. |
| `relationships`  | Every proposed relationship operation, endpoints (existing issue IDs or Projection Keys for creates), exact link type/ID, and direction. Parent assignments must also appear in the item payload.                                                                                                                                                                                                                                                              |
| `remote_links`   | Every remote-link operation, owning item, destination URL, title, and complete link payload.                                                                                                                                                                                                                                                                                                                                                                   |
| `sources`        | Object keyed by canonical source ID. Include URL, revision/version when available (otherwise null), and `content_sha256`: SHA-256 of the exact UTF-8 source snapshot used for planning. Hash all relevant source content, not just its ID, URL or revision; in self-contained mode include the supplied intake as a source snapshot.                                                                                                                           |
| `review`         | Delivery-coverage result/evidence, unresolved gaps, and any other reviewed material that gates these writes.                                                                                                                                                                                                                                                                                                                                                   |

Compute `sha256:` followed by lowercase hex SHA-256 of the UTF-8 bytes returned
by Python 3's `json.dumps(manifest, sort_keys=True, ensure_ascii=False,
separators=(",", ":"), allow_nan=False)`, with no trailing newline. Object-key
order is irrelevant; array order and string contents are preserved. Freeze
array order in the reviewed manifest and reuse it when checking confirmation.
Duplicate keys and non-finite numbers are invalid. This is the versioned
serialization above, not an unspecified platform hash or an RFC 8785 claim.

Use the bundled implementation:

```sh
python3 scripts/projection_digest.py /path/to/review-manifest.json
```

The script prints only the digest and hashes every manifest field; it does not
discover missing Jira fields or certify that the manifest is complete. Keep
the manifest private. Never put credentials into it or publish its source
snapshots. Immediately before mutation, re-read every source and rebuild its
content digest, re-fetch update targets to check the reviewed diff, then
recompute the manifest digest. A change to an issue field, hierarchy,
dependency, remote link, source content, or review gate invalidates approval.
Missing/unreadable source content blocks this check; do not substitute an old
digest.

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
- every backlog-mode Epic, and every single-item Epic whose source references a
  DR/SRS, has the applicable canonical DR/SRS remote link;
- every persisted projection key is unique and unchanged from the confirmed
  projection, and the confirmed `UC-XX::` coverage still passes.

A failed verification makes the operation incomplete.

## Failure handling

Report partial failures explicitly. Never claim an item or backlog is
synchronized if a parent, child, link, or verification step failed. If the
destination or a match is ambiguous, ask rather than create a duplicate.
