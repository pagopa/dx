#!/usr/bin/env python3
"""Compile a projection diff into Confluence granular-edit operations.

Companion to `project_native.py` (same projection grammar and block model). The
input is the *old* projection plus a *new* (edited) projection; the output is
the `edits[]` array consumed by `updateConfluenceContent` (draft write):

    [{"name": "replaceNode",      "localId": "<node id>", "value": "<node html>"},
     {"name": "insertNodeAfter",  "localId": "<neighbour id>", "value": "<node html>"},
     {"name": "insertNodeBefore", "localId": "<neighbour id>", "value": "<node html>"},
     {"name": "deleteNode",       "localId": "<node id>"}]

Design rules:

- Only changed nodes are emitted; unchanged blocks produce no op, so the token
  cost is proportional to the change, not to the page.
- Headings and paragraphs are re-rendered deterministically.
- Tables keep row- and cell-level addressing from the anchors sidecar: a cell
  text change replaces that cell's node; added/removed rows and columns become
  `insertNodeAfter`/`deleteNode` on the row/cell elements. New nodes get fresh
  `data-local-id`s so subsequent edits stay addressable.
- Lists keep item-level addressing the same way.
- Native/opaque blocks are never re-rendered; editing one raises
  `UnsupportedEdit` instead of silently losing fidelity.

Usage:
    compile_patch.py OLD.md NEW.md --anchors OLD.anchors.json [--out edits.json]

Exit codes: 0 success, 1 unsupported edit, 2 usage error.
"""

from __future__ import annotations

import argparse
import difflib
import html as html_lib
import json
import re
import sys
import uuid
from pathlib import Path

from project_native import Block, parse_projection

__all__ = [
    "UnsupportedEdit",
    "compile_patch",
    "render_md_inline",
    "parse_md_table",
    "parse_md_list",
]


class UnsupportedEdit(ValueError):
    """The change cannot be expressed without losing native fidelity."""


def render_md_inline(text: str) -> str:
    """Render Markdown inline text back to native inline HTML (deterministic)."""
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


def _new_id() -> str:
    return str(uuid.uuid4())


def _heading_text(body: str) -> str:
    return re.sub(r"^#{1,6}\s+", "", body)


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


def parse_md_list(body: str) -> list[str]:
    """Parse a projected Markdown list body into item texts."""
    items: list[str] = []
    for line in body.splitlines():
        m = re.match(r"^\s*(?:[-*]|\d+\.)\s+(.*)$", line)
        if m:
            items.append(m.group(1).strip())
    return items


def _text_node(text: str, node_id: str, node_tag: str, tag: str = "td") -> str:
    inline = render_md_inline(text)
    if node_tag in ("p", "li", "td", "th"):
        return f'<{node_tag} data-local-id="{node_id}">{inline}</{node_tag}>'
    return f'<{tag} data-local-id="{node_id}">{inline}</{tag}>'


def _new_cell(text: str, tag: str = "td") -> tuple[str, str]:
    cell_id, node_id = _new_id(), _new_id()
    return (
        f'<{tag} data-local-id="{cell_id}">'
        f'<p data-local-id="{node_id}">{render_md_inline(text)}</p></{tag}>',
        cell_id,
    )


def _new_row(texts: list[str], header: bool = False) -> tuple[str, str]:
    row_id = _new_id()
    tag = "th" if header else "td"
    cells = "".join(_new_cell(t, tag)[0] for t in texts)
    return f'<tr data-local-id="{row_id}">{cells}</tr>', row_id


def _new_item(text: str) -> tuple[str, str]:
    item_id, node_id = _new_id(), _new_id()
    return (
        f'<li data-local-id="{item_id}">'
        f'<p data-local-id="{node_id}">{render_md_inline(text)}</p></li>',
        item_id,
    )


def _insert_near(prev: str | None, nxt: str | None, value: str) -> dict:
    """insertNodeAfter(prev) or insertNodeBefore(nxt)."""
    if prev:
        return {"name": "insertNodeAfter", "localId": prev, "value": value}
    if nxt:
        return {"name": "insertNodeBefore", "localId": nxt, "value": value}
    raise UnsupportedEdit("no neighbour anchor to insert against")


def render_native_block(block: Block) -> str:
    """Render a whole anchored projection block back to native node HTML."""
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
    if block.kind == "list":
        tag = block.tag or "ul"
        items = "".join(_new_item(t)[0] for t in parse_md_list(block.body))
        return f'<{tag} data-local-id="{block.local_id}">{items}</{tag}>'
    if block.kind == "table":
        rows = parse_md_table(block.body)
        if not rows:
            raise UnsupportedEdit("cannot render an empty table")
        head = "".join(_new_cell(t, "th")[0] for t in rows[0])
        body = "".join(_new_row(r)[0] for r in rows[1:])
        return (
            f'<table data-local-id="{block.local_id}">'
            f"<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"
        )
    raise UnsupportedEdit(f"cannot re-render block kind {block.kind!r}")


def _table_edits(old_block: Block, new: Block, anchor: dict) -> list[dict]:
    old_rows = anchor.get("cells") or []
    old_row_ids = anchor.get("rowIds") or [""] * len(old_rows)
    new_rows = parse_md_table(new.body)
    old_sigs = [tuple(c["text"] for c in row) for row in old_rows]
    new_sigs = [tuple(r) for r in new_rows]

    sm = difflib.SequenceMatcher(a=old_sigs, b=new_sigs, autojunk=False)
    edits: list[dict] = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        if op == "delete":
            edits += [{"name": "deleteNode", "localId": old_row_ids[i]} for i in range(i1, i2)]
            continue
        # insert / replace: pair rows positionally, extras are inserted/deleted
        prev = old_row_ids[i1 - 1] if i1 > 0 else None
        nxt = old_row_ids[i1] if i1 < len(old_row_ids) else None
        for k in range(max(i2 - i1, j2 - j1)):
            oi = i1 + k if i1 + k < i2 else None
            nj = j1 + k if j1 + k < j2 else None
            if oi is None:
                row_html, new_id = _new_row(new_rows[nj], header=(nj == 0))
                edits.append(_insert_near(prev, nxt, row_html))
                prev = new_id
            elif nj is None:
                edits.append({"name": "deleteNode", "localId": old_row_ids[oi]})
            else:
                edits += _row_cell_edits(old_rows[oi], new_rows[nj])
    return edits


def _row_cell_edits(old_cells: list[dict], new_texts: list[str]) -> list[dict]:
    edits: list[dict] = []
    for j in range(max(len(old_cells), len(new_texts))):
        if j < len(old_cells) and j < len(new_texts):
            if new_texts[j] != old_cells[j]["text"]:
                c = old_cells[j]
                edits.append({
                    "name": "replaceNode",
                    "localId": c["nodeId"],
                    "value": _text_node(new_texts[j], c["nodeId"], c["nodeTag"], c["tag"]),
                })
        elif j < len(new_texts):
            tag = old_cells[0]["tag"] if old_cells else "td"
            cell_html, _ = _new_cell(new_texts[j], tag)
            prev = old_cells[j - 1]["cellId"] if j > 0 else None
            nxt = old_cells[j]["cellId"] if j < len(old_cells) else None
            edits.append(_insert_near(prev, nxt, cell_html))
        else:
            edits.append({"name": "deleteNode", "localId": old_cells[j]["cellId"]})
    return edits


def _list_edits(old_block: Block, new: Block, anchor: dict) -> list[dict]:
    items = anchor.get("items") or []
    new_texts = parse_md_list(new.body)
    old_texts = [it["text"] for it in items]
    ordered = anchor.get("ordered", old_block.tag == "ol")

    sm = difflib.SequenceMatcher(a=old_texts, b=new_texts, autojunk=False)
    edits: list[dict] = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        if op == "delete":
            edits += [{"name": "deleteNode", "localId": items[i]["itemId"]} for i in range(i1, i2)]
            continue
        prev = items[i1 - 1]["itemId"] if i1 > 0 else None
        nxt = items[i1]["itemId"] if i1 < len(items) else None
        for k in range(max(i2 - i1, j2 - j1)):
            oi = i1 + k if i1 + k < i2 else None
            nj = j1 + k if j1 + k < j2 else None
            if oi is None:
                item_html, new_id = _new_item(new_texts[nj])
                edits.append(_insert_near(prev, nxt, item_html))
                prev = new_id
            elif nj is None:
                edits.append({"name": "deleteNode", "localId": items[oi]["itemId"]})
            else:
                it = items[oi]
                edits.append({
                    "name": "replaceNode",
                    "localId": it["nodeId"],
                    "value": _text_node(new_texts[nj], it["nodeId"], it["nodeTag"], "li"),
                })
    return edits


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
    anchor = anchors_by_id.get(block.local_id) or {}
    if block.kind == "table":
        return _table_edits(block, new, anchor)
    if block.kind == "list":
        return _list_edits(block, new, anchor)
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
            raise UnsupportedEdit("cannot insert a new opaque node")
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
