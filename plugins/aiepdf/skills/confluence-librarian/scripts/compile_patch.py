#!/usr/bin/env python3
"""Compile a projection diff into Confluence granular-edit operations.

Companion to `project_native.py` (same projection grammar and block model). The
input is the *old* projection plus a *new* (edited) projection; the output is
the `edits[]` array consumed by `updateConfluenceContent` (draft write):

    [{"name": "replaceNode",     "localId": "<node id>", "value": "<node html>"},
     {"name": "insertNodeAfter", "localId": "<neighbour id>", "value": "<node html>"},
     {"name": "deleteNode",      "localId": "<node id>"}]

Design rules (spike v0):

- Only the changed nodes are emitted; unchanged blocks produce no op. This is
  what makes the token cost proportional to the change, not the page.
- Headings and paragraphs are re-rendered deterministically from the projection.
- Tables keep **cell-level** addressing from the anchors sidecar: a cell text
  change becomes a `replaceNode` on that cell's node (the inner `<p>`, so the
  `<td>` and the rest of the table stay identical). A shape change (rows/cols
  added or removed) is refused in v0 rather than losing cell ids.
- Native/opaque blocks are never re-rendered. Editing one raises
  `UnsupportedEdit` instead of silently losing fidelity.

Usage:
    compile_patch.py OLD.md NEW.md --anchors OLD.anchors.json [--out edits.json]

Exit codes: 0 success, 1 unsupported edit, 2 usage error.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
from pathlib import Path

from project_native import Block, parse_projection

__all__ = ["UnsupportedEdit", "compile_patch", "render_md_inline", "parse_md_table"]


class UnsupportedEdit(ValueError):
    """The change cannot be expressed without losing native fidelity (v0)."""


def render_md_inline(text: str) -> str:
    """Render Markdown inline text back to native inline HTML.

    Deterministic inverse of `project_native.render_inline` for the supported
    subset: code spans, links, strong, emphasis. Text is HTML-escaped.
    """
    parts = re.split(r"(`[^`]*`)", text)
    out: list[str] = []
    for part in parts:
        if len(part) >= 2 and part.startswith("`") and part.endswith("`"):
            out.append("<code>" + html_lib.escape(part[1:-1], quote=False) + "</code>")
            continue
        chunk = html_lib.escape(part, quote=False)
        chunk = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', chunk)
        chunk = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", chunk)
        chunk = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", chunk)
        out.append(chunk)
    return "".join(out)


def _heading_text(body: str) -> str:
    return re.sub(r"^#{1,6}\s+", "", body)


def render_native_block(block: Block) -> str:
    """Render an anchored projection block back to its native node HTML."""
    if block.kind == "heading":
        tag = block.tag or f"h{len(block.body) - len(block.body.lstrip('#'))}"
        return (
            f'<{tag} data-local-id="{block.local_id}">'
            f"{render_md_inline(_heading_text(block.body))}</{tag}>"
        )
    if block.kind == "paragraph":
        return (
            f'<p data-local-id="{block.local_id}">'
            f"{render_md_inline(block.body)}</p>"
        )
    raise UnsupportedEdit(f"cannot re-render block kind {block.kind!r}")


def parse_md_table(body: str) -> list[list[str]]:
    """Parse a projected GFM table body into rows of cell Markdown text."""
    rows: list[list[str]] = []
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if all(re.fullmatch(r"-{2,}", c) for c in cells):
            continue  # delimiter row
        rows.append([c.replace("\\|", "|") for c in cells])
    return rows


def _render_cell(text: str, cell: dict) -> str:
    inline = render_md_inline(text)
    if cell.get("nodeTag") == "p":
        return f'<p data-local-id="{cell["nodeId"]}">{inline}</p>'
    tag = cell.get("tag", "td")
    return f'<{tag} data-local-id="{cell["nodeId"]}">{inline}</{tag}>'


def _replace(block: Block, new: Block, anchors_by_id: dict) -> list[dict]:
    if block.kind == "native":
        raise UnsupportedEdit(
            f"opaque node {block.local_id!r} was edited; structured edit required"
        )
    if block.kind in ("heading", "paragraph"):
        return [{
            "name": "replaceNode",
            "localId": block.local_id,
            "value": render_native_block(new),
        }]
    if block.kind == "table":
        anchor = anchors_by_id.get(block.local_id) or {}
        old_cells = anchor.get("cells") or []
        new_rows = parse_md_table(new.body)
        if len(new_rows) != len(old_cells) or any(
            len(r) != len(old_cells[i]) for i, r in enumerate(new_rows)
        ):
            raise UnsupportedEdit(
                f"table {block.local_id!r} changed shape; cell-level patch "
                "unsupported in v0"
            )
        edits: list[dict] = []
        for i, row in enumerate(new_rows):
            for j, text in enumerate(row):
                if text != old_cells[i][j].get("text", ""):
                    edits.append({
                        "name": "replaceNode",
                        "localId": old_cells[i][j]["nodeId"],
                        "value": _render_cell(text, old_cells[i][j]),
                    })
        return edits
    raise UnsupportedEdit(f"cannot patch block kind {block.kind!r}")


def compile_patch(old_md: str, new_md: str, old_anchors: dict) -> list[dict]:
    """Return the granular edits transforming `old_md` into `new_md`."""
    old = parse_projection(old_md)
    new = parse_projection(new_md)
    old_by = {b.local_id: b for b in old}
    new_ids = {b.local_id for b in new}
    anchors_by_id = {b["localId"]: b for b in old_anchors.get("blocks", [])}

    edits: list[dict] = []
    for block in old:  # deletions, in old order
        if block.local_id not in new_ids:
            edits.append({"name": "deleteNode", "localId": block.local_id})

    previous: str | None = None
    for block in new:
        if block.local_id in old_by:
            if old_by[block.local_id].hash != block.hash:
                edits.extend(_replace(old_by[block.local_id], block, anchors_by_id))
            previous = block.local_id
            continue
        if block.kind == "native":
            raise UnsupportedEdit("cannot insert a new opaque node in v0")
        if previous is None:
            raise UnsupportedEdit("cannot insert a new first block (no anchor)")
        edits.append({
            "name": "insertNodeAfter",
            "localId": previous,
            "value": render_native_block(block),
        })
        previous = block.local_id
    return edits


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("old", help="old projection markdown")
    parser.add_argument("new", help="new projection markdown")
    parser.add_argument("--anchors", required=True, help="old anchors JSON")
    parser.add_argument("--out", help="write edits JSON here (default stdout)")
    args = parser.parse_args(argv)

    old_md = Path(args.old).read_text(encoding="utf-8")
    new_md = Path(args.new).read_text(encoding="utf-8")
    anchors = json.loads(Path(args.anchors).read_text(encoding="utf-8"))
    try:
        edits = compile_patch(old_md, new_md, anchors)
    except UnsupportedEdit as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    payload = json.dumps(edits, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        Path(args.out).write_text(payload, encoding="utf-8")
    else:
        sys.stdout.write(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
