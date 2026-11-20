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

## Edit shape — `updateConfluenceContent`

```text
contentId:     <the target's id: the copy's contentId for a working copy, else
               the published page's id>
draft:         true
snapshotToken: <token from the baseline fetch, e.g. "v:1">
edits:         [ { name: "replaceNode" | "insertNodeAfter" |
                       "insertNodeBefore" | "deleteNode",
                   localId: "<data-local-id of the target node>",
                   value:  "<replacement node HTML>" } ]
```

Send the whole change as a single `edits` array in one write. The response
echoes the applied content; `content.webUrl` (a `resumedraft.action` URL) is the
draft's resume URL. The write validates and rejects an invalid document, so no
dry-run is needed.

## Baseline contract

The **baseline** is the page's current native HTML together with its
`snapshotToken` and version — the reference for verifying that an edit changed
only what was requested.

- **In context by default.** Hold the baseline in context or on disk for the
  task and read it from there. A fresh full read is warranted only for a new
  `snapshotToken` or after `snapshot_stale`; the write's response (echoed
  content, `status`, `webUrl`) verifies the edit on its own, and any other
  follow-up uses a cheap shape (`detail: summary`, `responseFields`).
- **Staleness.** A token that comes back missing, as the published base, or
  stale is dead: refetch the draft once and reapply the intended change.
- **A new baseline** comes from a fresh fetch, or when the integration returns
  canonical output (a dry-run result or the persisted page) with a new snapshot
  token. Never rebuild it from memory.
- **Do not rediscover what you created.** Take the copy's `contentId` (or a
  page's `id`/`webUrl`/`title`) from the create/copy/update response, rather
  than locating it again with `search`, `listConfluenceContent`, or
  `getConfluenceContentDescendants`.
- **Persist to a file only when it pays.** For a large page edited repeatedly, or
  work that resumes in another session, save it and read it back as the starting
  baseline on resume:

  ```text
  <working-dir>/confluence/<content-id>.html      # full native HTML body
  <working-dir>/confluence/<content-id>.json      # { contentId, title, spaceId,
                                                   #   snapshotToken, version } —
                                                   # all from the baseline fetch
                                                   # response; the copy response
                                                   # carries only the copy's id
  ```

  Once persisted, query the file — never `view` it whole. One deterministic
  extraction that prints the target node and its `data-local-id` is enough
  (e.g. `jq -r '.data.body.value' <file> | rg -o '.{0,80}<needle>.{0,200}'`).
  The same holds for any large tool output the environment saved to a file:
  slice or match it, never read the file back in full.

- Never store credentials in baseline files.
