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

A create cannot attach to a page that does not exist yet: create the page with
the expand alone, attach the SVG, then insert the media node above the expand.
For an edit, both the attachment and the media node are changes on the draft,
applied with the edit shape in [edit.md](./edit.md).

Done when the diagram renders in the page and the same Mermaid text is in the
expand.
