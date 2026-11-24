# confluence-librarian

Working notes for maintainers and coding agents. Consumer documentation lives in
[README.md](./README.md); keep the readme free of internal procedures. The
Harbor benchmark keeps its runbook in [harbor/README.md](./harbor/README.md).

## Skill layout

`SKILL.md` routes: the workflow plus the rules both paths share. Branch-only
material sits in `references/` — `edit.md` (edit protocol, call shapes, baseline
contract), `mermaid.md` (Mermaid to SVG), `translation.md` (translation rules).

`scripts/extract-node.js` is the offline node extractor `edit.md` points at for
a persisted baseline: hand-written, dependency-free ESM, with a `node --test`
suite beside it.

`scripts/render-mermaid.mjs` is a build artifact. Its source and tests live in
[`plugins/padef/src`](../../src), and `plugins/padef` bundles them with tsdown
into that one file, Pele included, so Node runs it offline with no install step
and no cache to warm.

Keep pointers relative and inside this folder — Harbor stages the whole skill
directory into the container, so the agent reads `references/` and `scripts/` at
run time.

## Rebuild the renderer bundle

```sh
pnpm nx run padef:build
pnpm nx run padef:test
pnpm nx run padef:build:check   # rebuilds, then fails when the commit is stale
```

Commit the regenerated `scripts/render-mermaid.mjs` alongside the source change
that produced it: the file ships inside the skill, so a commit that carries one
without the other ships a renderer that disagrees with its source.
