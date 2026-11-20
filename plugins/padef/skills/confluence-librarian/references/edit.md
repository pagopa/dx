# Editing a page in place

Reached from [SKILL.md](../SKILL.md) for the edit path. An existing page holds
content with **no Markdown form** — `toc`, collapsible `expand`/`<details>`,
info/note/tip/warning/error panels, images, smart links, inline comments,
`data-local-id` anchors — and converting it to Markdown and back silently
destroys them. Edit the page's own native HTML.

- A full `body` is the escape hatch for a change a node-level edit cannot
  express, and is still the baseline with the smallest possible diff.
- Keep the `data-local-id` attributes on nodes you keep: granular edits address
  nodes by those anchors.

## Copy shape — `executeWrite`

```text
name: copyConfluenceContent
inputs: { contentId, title, parentContentId }     # or destinationSpaceKey
```

The copy's id in the response is the target for every later write on the working
copy. Do not filter it away: omit `responseFields`, or request
`contentId`/`_links`; the keys `id`/`webUrl`/`spaceId` do not exist on this
response, and a filter naming them drops the id, leaving only `title`/`status`.
Build the page URL from the response's `baseUrl` + `_links.webui`.

## Write shapes — `updateConfluenceContent`

### Bootstrap a draft

When the draft read returns published content with no `snapshotToken`, first
create the draft without changing the content:

```text
contentId: <target id>
draft:     true
body:      { format: "html", value: "<unchanged baseline body>" }
```

Use the returned `snapshotToken` and draft resume URL for the granular edit that
follows. This tokenless write is the only bootstrap exception; every subsequent
update sends the baseline token.

### Edit an existing draft

```text
contentId:     <target id>
draft:         true
snapshotToken: <baseline token, verbatim>
edits:         [ { name: "replaceNode" | "insertNodeAfter" |
                       "insertNodeBefore" | "deleteNode",
                   localId: "<data-local-id>",
                   value:  "<replacement node HTML>" } ]
```

Send the whole change as a single `edits` array in one write. The response
echoes the applied content; `content.webUrl` (a `resumedraft.action` URL) is the
draft's resume URL. The write validates and rejects an invalid document, so no
dry-run is needed.

## Baseline contract

The **baseline** is the native HTML plus any draft token and version from the
read or write. It is the reference for proving that only the requested nodes
changed. Follow one branch:

| Read result                                 | Action                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Draft body and token                        | Hold it in context; apply the granular edit.                              |
| Published body, no token                    | Bootstrap the draft unchanged, then use the token returned by that write. |
| `snapshot_stale` or published base mid-task | Refetch the draft, hold the new baseline, and reapply the change once.    |

If the refetched draft is rejected again, the page moved; re-read the affected
nodes before another write. The update response's echoed content, `status`, and
`webUrl` verify the result. Use a cheaper shape for unrelated follow-up reads.

Take identifiers and URLs from the create/copy/update response; do not rediscover
them. Build a new baseline only from a fresh fetch or a canonical response with
a new token, never from memory.

Persist the baseline only for a large page or resumable task:

```text
<working-dir>/confluence/<content-id>.html      # full native HTML body
<working-dir>/confluence/<content-id>.json      # { contentId, title, spaceId,
                                                 #   snapshotToken, version } —
                                                 # all from the baseline fetch
                                                 # response; the copy response
                                                 # carries only the copy's id
```

Query a persisted baseline by node; do not load the whole file:

```sh
node <skill-dir>/scripts/extract-node.js confluence/<content-id>.html \
  --local-id <data-local-id>
node <skill-dir>/scripts/extract-node.js confluence/<content-id>.html \
  --text "rollout date"
```

`--local-id` prints the whole element carrying that id: that output is the value
`replaceNode` takes. `--text` finds the innermost element whose visible text
contains the needle — case-sensitive, across inline markup — which is how you
discover an id from what the page says. Exit `2` means several matches; the
candidates are listed.

Each match also reports its `anchor`, the nearest ancestor carrying a
`data-local-id`:

| Anchor                             | Next move                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `anchor=self`                      | The printed HTML is the value `replaceNode` takes.                                      |
| `anchor=<tag>[local-id=…] bytes …` | The match has no id of its own: re-run with that `--local-id` for the replaceable HTML. |
| `anchor=(none)`                    | Fall back to the full `body`.                                                           |

`--json` reports the same anchor beside `html`, which stays the match's own
slice. Apply the same slice-or-match rule to any large saved tool output.

- Never store credentials in baseline files.
