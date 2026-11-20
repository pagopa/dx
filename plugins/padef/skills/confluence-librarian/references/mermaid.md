# Mermaid diagrams

Reached from [SKILL.md](../SKILL.md) whenever the source or the page holds a
Mermaid fence. Show readers the diagram and keep its source one click away:
render the fence to SVG with [Pele](https://pele.run/) instead of publishing the
fence as a code block.

- open `https://pele.run/playground#source=<url-encoded source>` in a browser and
  use **Copy SVG** on the rendered diagram; or
- download the pinned build and read `pele.render(source).svg`:

  ```sh
  curl -fsSL -o pele.js https://cdn.jsdelivr.net/npm/pele@1.13.0/dist/pele.global.js
  echo "0b0a46c57a5a6971670c09f5ec4066705bd78505f90fd11adf6260325efa0910  pele.js" | shasum -a 256 -c -
  ```

  Version and checksum are pinned together, because `pele@1` is a moving range:
  a bare hash would fail on the next 1.x release. Bump both when updating.

Save it as `<slug>.svg`. Confluence has no inline `<svg>` node and its HTML
conversion never uploads files, so the diagram reaches the page as an
attachment-backed media node:

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

A create cannot attach a file to a page that does not exist yet, and an unbuilt
diagram must never reach a reader as a bare expand. Assemble the page on a
draft, then publish the assembled result:

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
   unpublished draft, stop at step 4 and report the draft's resume URL.

A document without diagrams keeps the single published create. An existing page
keeps its edits draft-only, media node included: its published version stays
untouched until the user publishes.

Done when the diagram itself renders in the page — not just its source expand —
and the expand holds the fence's lines unchanged.
