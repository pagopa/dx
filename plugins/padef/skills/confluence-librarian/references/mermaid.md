# Mermaid diagrams

Reached from [SKILL.md](../SKILL.md) for any Mermaid fence. Render the diagram
and retain its unchanged source beside it.

## Render the fence to SVG

[scripts/render-mermaid.mjs](../scripts/render-mermaid.mjs) turns a fence into
an SVG with [Pele](https://pele.run/), bundled into that one file: Node runs it
offline, with no install step and no cache to warm.

1. Pipe the fence's lines in on stdin (`-`), or name a file that holds them, and
   name the SVG:

   ```sh
   node …/scripts/render-mermaid.mjs - diagram-1.svg <<'EOF'
   graph TD;A[Start]-->B{OK?};B-->|yes|C[Ship];B-->|no|D[Fix]
   EOF
   ```

2. Read the status line: `rendered <type> <W>x<H> -> <path>`, or an `error`
   line with a non-zero exit. `No diagram type detected` means the fence holds
   no diagram: correct the fence, or drop the render and keep the fence as text.

## Place the diagram on the page

Confluence has no inline `<svg>` node and its HTML conversion never uploads
files, so the diagram reaches the page as an attachment-backed media node:

1. Upload the SVG with `createConfluenceAttachment` — `contentId` of the page
   plus `localFilePath` of the SVG. It returns a `curl` command; run it to upload
   the file, and take the media `id` and `collection` the upload returns.
2. Put the media node where the fence was:

   ```html
   <figure
     data-type="media-single"
     data-layout="center"
     data-width="80"
     data-width-type="percentage"
   >
     <div
       data-type="media"
       data-media-type="file"
       data-id="<media id>"
       data-collection="<collection>"
       data-alt="<diagram title>"
     ></div>
   </figure>
   ```

3. Keep the fence's lines unchanged in a collapsible expand directly below it:

   ```html
   <details>
     <summary>Mermaid source</summary>
     <pre><code>…</code></pre>
   </details>
   ```

## Assemble a page that carries diagrams

A create cannot attach a file to a page that does not exist yet, so a new page
with diagrams lands in two passes:

1. `createConfluenceContent` with `draft: true`: the body from SKILL.md step 2
   minus the media nodes, each diagram's expand already in place. Keep the
   draft's `contentId`.
2. Read the draft once as the baseline (`draft: true`, HTML, `detail: full`).
   It carries the `snapshotToken` and the `data-local-id` of every expand, which
   the create response does not.
3. Upload the SVGs to that `contentId`, as the upload step above describes.
4. Insert each media node above its expand with the edit shape in
   [edit.md](./edit.md): `draft: true`, the baseline's `snapshotToken`,
   `insertNodeBefore` the expand's `data-local-id`.
5. Publish only when the user asked for a published page: one more
   `updateConfluenceContent` on the same `contentId` with `draft` omitted and
   `body` set to the assembled native HTML. When the user asked for an
   unpublished draft, stop at step 4 and report the draft page URL
   (`baseUrl` + `webUrl`) labeled as unpublished.

No diagrams means one create call. Existing pages stay draft-only, including
diagram edits, until the user publishes them.

Done when the diagram itself renders in the page — not just its source expand —
and the expand holds the fence's lines unchanged.
