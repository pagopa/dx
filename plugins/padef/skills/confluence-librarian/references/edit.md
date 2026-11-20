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
snapshotToken: <the baseline fetch's snapshotToken, sent verbatim>
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
- **No draft yet.** A page never edited in draft mode returns its published
  body (`status: "current"`) and no draft token. That read is the baseline: send
  the first `draft: true` write against it, which creates the draft, and take
  the draft token and resume URL from the write's response. There is nothing to
  refetch and no token to wait for.
- **Stale draft.** Only a draft that already existed has a token that can go
  dead: `snapshot_stale`, or a token that came back missing or as the published
  base mid-task. Discard it, refetch the draft once, reapply the intended
  change, and keep the new token. A rejection after that refetch means the page
  moved underneath the task: re-read the changed nodes before writing again.
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

  Once persisted, query the file — never `view` it whole. This skill ships
  `scripts/extract-node.js`, a dependency-free extractor that prints one
  complete element with its `data-local-id` and byte span:

  ```sh
  node <skill-dir>/scripts/extract-node.js confluence/<content-id>.html \
    --local-id <data-local-id>        # the exact node to change
  node <skill-dir>/scripts/extract-node.js confluence/<content-id>.html \
    --text "rollout date"             # smallest element holding that body text
  ```

  It matches decoded visible text only, never attribute values or script
  bodies, so `R&D` finds `R&amp;D` and a needle spans inline tags
  (`rollout date` finds `<p>rollout <strong>date</strong></p>`, selecting the
  paragraph). It rebuilds the element from a balanced scan, so the node it
  prints is never truncated. A needle that
  matches several nodes exits `2` and lists their anchors: pass the `--local-id`
  it names, add `--all` when every match is wanted, or `--list` for anchors
  alone. The same holds for any large tool output the environment saved to a
  file: slice or match it, never read the file back in full.

- Never store credentials in baseline files.
