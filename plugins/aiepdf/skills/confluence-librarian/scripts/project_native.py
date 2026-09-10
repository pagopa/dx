#!/usr/bin/env python3
"""Derive a block-addressable Markdown *projection* from Confluence native HTML.

Part of the confluence-librarian spike: see the handoff plan
https://gist.github.com/gunzip/30a7dca16e0966fec7ab403b7e81d8a0

The projection is a *derived* view of a page's native body (returned by
`getConfluenceContent` with `content_format: html`). It exists for human
authoring/review in Markdown, while the native page stays the source of truth:
a projection is never re-converted wholesale. Native constructs that have no
faithful Markdown form are emitted **verbatim** inside a `:::native` fence, so
they are never re-serialised unless the user explicitly edits them.

Projection grammar (v0, deterministic):

    {#<local-id>}
    ## A heading

    {#<local-id>}
    A paragraph with `code` and a [link](https://example.com).

    {#<local-id>}
    | ID | Value |
    | -- | ----- |
    | `a` | 1 |

    :::native {#<local-id> kind="details"}
    <details data-local-id="...">...verbatim...</details>
    :::

- An anchored block starts with a line `{#<local-id>}` followed by its Markdown
  body up to a blank line. Supported anchored kinds: headings, paragraphs,
  tables (cell-level addressing lives in the anchors sidecar).
- A native/opaque block is `:::native {#<local-id> kind="<tag>"}` ... `:::` with
  the raw native HTML verbatim. Everything the projection cannot render back
  deterministically (macros, `details`, panels, lists, unknown elements) is
  opaque.
- Blocks are separated by a blank line.

`project()` also returns an anchors document, a queryable index that lets the
agent target a node cheaply without reading the whole page:

    {"blocks": [{"localId", "kind", "tag", "level", "text", "hash", "cells"}]}

Only the standard library is used (same as the skill's historical helpers).

Usage:
    project_native.py <native.html> [--projection OUT.md] [--anchors OUT.json]

Exit codes: 0 success, 2 usage error.
"""

from __future__ import annotations

import argparse
import hashlib
import html as html_lib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

# HTML void elements: opening tag with no closing tag.
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}
HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
ANCHORED_TAGS = HEADING_TAGS | {"p", "table"}
# A top-level element whose subtree contains any of these is native-only.
NAMESPACE_PREFIXES = ("ac:", "ri:", "at:")
BLOCK_LEVEL_IN_P = ("<table", "<div", "<ul", "<ol", "<p", "<details", "<pre", "<blockquote")

_ATTR_RE = re.compile(r"([:\w.-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)')")
_TAG_NAME_RE = re.compile(r"<(/?)([a-zA-Z][\w:.-]*)")
_TABLE_ROW_RE = re.compile(r"<tr\b[^>]*>(.*?)</tr>", re.S | re.I)
_TABLE_CELL_RE = re.compile(r"<(th|td)\b([^>]*)>(.*?)</\1>", re.S | re.I)
_PARAGRAPH_RE = re.compile(r"<p\b([^>]*)>(.*?)</p>", re.S | re.I)
_ANCHOR_LINE_RE = re.compile(r"^\{#([^}\s]+)\}$")
_NATIVE_OPEN_RE = re.compile(r'^:::native\s*\{#([^}\s]+)\s+kind="([^"]+)"\}\s*$')


@dataclass
class Cell:
    """One table cell's editable node (the inner <p>, or the cell itself)."""

    node_id: str
    node_tag: str  # "p" | "td" | "th"
    tag: str       # "td" | "th"
    text: str      # projected Markdown inline text


@dataclass
class Block:
    """A top-level native element reduced to a projection block."""

    local_id: str | None
    kind: str            # heading | paragraph | table | native
    body: str            # Markdown body (anchored) or raw native HTML (native)
    tag: str | None = None
    level: int | None = None
    cells: list[list[Cell]] | None = None
    hash: str = ""

    def digest(self) -> str:
        payload = self.body.encode("utf-8")
        return "sha1:" + hashlib.sha1(payload).hexdigest()


def parse_attrs(tag: str) -> dict[str, str]:
    """Parse the attributes of one opening tag (name included) into a dict."""
    return {
        m.group(1).lower(): (m.group(2) if m.group(2) is not None else m.group(3) or "")
        for m in _ATTR_RE.finditer(tag)
    }


def _iter_tags(text: str):
    """Yield ('comment'|'tag', raw, start, end) for each markup token."""
    i, n = 0, len(text)
    while i < n:
        j = text.find("<", i)
        if j < 0:
            return
        if text.startswith("<!--", j):
            k = text.find("-->", j)
            k = n if k < 0 else k + 3
            yield "comment", text[j:k], j, k
            i = k
            continue
        k = text.find(">", j)
        if k < 0:
            return
        yield "tag", text[j + 1:k], j, k + 1
        i = k + 1


def split_top_level(text: str) -> list[str]:
    """Return the raw HTML of each top-level element, in document order.

    Supports nested elements and void/self-closing tags; ignores top-level
    whitespace. A top-level HTML comment is returned as its own block.
    """
    blocks: list[str] = []
    stack: list[str] = []
    start: int | None = None
    for kind, raw, a, b in _iter_tags(text):
        if kind == "comment":
            if not stack:
                blocks.append(text[a:b])
            continue
        m = _TAG_NAME_RE.match("<" + raw)
        if not m:
            continue
        closing = m.group(1) == "/"
        name = m.group(2).lower()
        if closing:
            if stack:
                stack.pop()
                if not stack and start is not None:
                    blocks.append(text[start:b])
                    start = None
            continue
        self_closing = raw.rstrip().endswith("/")
        void = name in VOID_TAGS or self_closing
        if not stack:
            start = a
        if void:
            if start is not None and not stack:
                blocks.append(text[start:b])
                start = None
        else:
            stack.append(name)
    return blocks


def _inner(raw: str) -> str:
    """Content between the first '>' and the matching last '<'."""
    i = raw.find(">")
    j = raw.rfind("<")
    return raw[i + 1:j] if 0 <= i < j else ""


def render_inline(fragment: str) -> str:
    """Render a native inline fragment to Markdown inline text."""
    text = re.sub(r"<p\b[^>]*>", "", fragment)
    text = text.replace("</p>", "")
    text = re.sub(
        r'<a\b[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
        lambda m: f"[{render_inline(m.group(2))}]({m.group(1)})",
        text, flags=re.S | re.I,
    )
    text = re.sub(
        r"<(strong|b)>(.*?)</\1>",
        lambda m: f"**{render_inline(m.group(2))}**", text, flags=re.S | re.I,
    )
    text = re.sub(
        r"<(em|i)>(.*?)</\1>",
        lambda m: f"*{render_inline(m.group(2))}*", text, flags=re.S | re.I,
    )
    text = re.sub(
        r"<code>(.*?)</code>",
        lambda m: "`" + html_lib.unescape(re.sub(r"<[^>]+>", "", m.group(1))) + "`",
        text, flags=re.S | re.I,
    )
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return html_lib.unescape(text).strip()


def _has_native_subtree(raw: str) -> bool:
    return any(f"<{p}" in raw for p in NAMESPACE_PREFIXES)


def _is_table(raw: str) -> bool:
    return bool(re.match(r"<\s*table\b", raw, re.I))


def _is_paragraph(raw: str) -> bool:
    return bool(re.match(r"<\s*p\b", raw, re.I))


def parse_table(raw: str) -> tuple[str, list[list[Cell]]]:
    """Project a native <table> to a GFM table plus its cell-address matrix."""
    rows: list[list[Cell]] = []
    for row_html in _TABLE_ROW_RE.findall(raw):
        cells: list[Cell] = []
        for cell_tag, cell_attrs, cell_inner in _TABLE_CELL_RE.findall(row_html):
            cell_tag = cell_tag.lower()
            cell_attrs_full = f"<{cell_tag}{cell_attrs}>"
            cell_id = parse_attrs(cell_attrs_full).get("data-local-id", "")
            pm = _PARAGRAPH_RE.match(cell_inner.strip())
            if pm:
                p_attrs = f"<p{pm.group(1)}>"
                node_id = parse_attrs(p_attrs).get("data-local-id") or cell_id
                text = render_inline(pm.group(2))
                node_tag = "p"
            else:
                node_id = cell_id
                text = render_inline(cell_inner)
                node_tag = cell_tag
            cells.append(Cell(node_id=node_id, node_tag=node_tag, tag=cell_tag, text=text))
        rows.append(cells)
    if not rows:
        return "", []
    width = max(len(r) for r in rows)

    def line(cells: list[Cell]) -> str:
        padded = cells + [Cell("", "p", "td", "")] * (width - len(cells))
        return "| " + " | ".join(c.text.replace("|", "\\|") for c in padded) + " |"

    md = [line(rows[0]), "| " + " | ".join("--" for _ in range(width)) + " |"]
    md += [line(r) for r in rows[1:]]
    return "\n".join(md), rows


def block_from_raw(raw: str) -> Block:
    """Classify and reduce one top-level element to a projection Block."""
    name_match = _TAG_NAME_RE.match(raw)
    if not name_match:
        # Bare top-level text or comment: opaque.
        return Block(local_id=None, kind="native", body=raw, tag=None).with_hash()
    tag = name_match.group(2).lower()
    attrs = parse_attrs(raw[:raw.find(">") + 1])
    local_id = attrs.get("data-local-id")
    inner = _inner(raw)

    if local_id:
        if tag in HEADING_TAGS and not _has_native_subtree(raw):
            level = int(tag[1])
            body = "#" * level + " " + render_inline(inner)
            return Block(local_id=local_id, kind="heading", body=body, tag=tag,
                         level=level).with_hash()
        if tag == "p" and not _has_native_subtree(raw) and not any(
            b in inner for b in BLOCK_LEVEL_IN_P
        ):
            return Block(local_id=local_id, kind="paragraph",
                         body=render_inline(inner), tag="p").with_hash()
        if tag == "table" and not _has_native_subtree(raw):
            body, cells = parse_table(raw)
            if body:
                return Block(local_id=local_id, kind="table", body=body, tag="table",
                             cells=cells).with_hash()
    # No native data-local-id (or a native-only construct): opaque and never
    # re-rendered. A synthetic id is assigned by `project()` for display.
    return Block(local_id=local_id, kind="native", body=raw, tag=tag).with_hash()


def _with_hash(self) -> Block:  # noqa: N807 - attached below for readability
    self.hash = self.digest()
    return self


Block.with_hash = _with_hash  # type: ignore[attr-defined]


def project(native_html: str) -> tuple[str, dict]:
    """Return (projection_markdown, anchors_document)."""
    blocks: list[Block] = []
    seen: set[str] = set()
    for raw in split_top_level(native_html):
        stripped = raw.lstrip()
        # Top-level comments and stray text are not addressable; skip them.
        if not stripped.startswith("<") or stripped.startswith("<!--"):
            continue
        block = block_from_raw(raw)
        if block.local_id is None:
            # Unaddressable element: keep it verbatim under a synthetic id so
            # it is still visible for review, but never patchable.
            block.local_id = "auto-" + block.hash.split(":", 1)[1][:12]
        while block.local_id in seen:
            block.local_id += "x"
        seen.add(block.local_id)
        blocks.append(block)
    projection = serialize(blocks)
    anchors = {
        "blocks": [
            {
                "localId": b.local_id,
                "kind": b.kind,
                "tag": b.tag,
                "level": b.level,
                "text": (b.body.splitlines()[0] if b.body else "")[:120],
                "hash": b.hash,
                "cells": (
                    [
                        [
                            {
                                "nodeId": c.node_id,
                                "nodeTag": c.node_tag,
                                "tag": c.tag,
                                "text": c.text,
                            }
                            for c in row
                        ]
                        for row in b.cells
                    ]
                    if b.cells is not None else None
                ),
            }
            for b in blocks
        ]
    }
    return projection, anchors


def serialize(blocks: list[Block]) -> str:
    """Render a list of blocks to the projection grammar (deterministic)."""
    out: list[str] = []
    for b in blocks:
        if b.kind == "native":
            out.append(f':::native {{#{b.local_id} kind="{b.tag}"}}')
            out.append(b.body)
            out.append(":::")
        else:
            out.append(f"{{#{b.local_id}}}")
            out.append(b.body)
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def parse_projection(markdown: str) -> list[Block]:
    """Parse a projection back into blocks (inverse of `serialize`)."""
    lines = markdown.split("\n")
    blocks: list[Block] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        native = _NATIVE_OPEN_RE.match(line.strip())
        if native:
            local_id, kind_tag = native.group(1), native.group(2)
            i += 1
            buf: list[str] = []
            while i < len(lines) and lines[i].strip() != ":::":
                buf.append(lines[i])
                i += 1
            i += 1  # consume closing fence
            blocks.append(Block(local_id=local_id, kind="native",
                                body="\n".join(buf), tag=kind_tag).with_hash())
            continue
        anchor = _ANCHOR_LINE_RE.match(line.strip())
        if anchor:
            local_id = anchor.group(1)
            i += 1
            buf = []
            while i < len(lines) and lines[i].strip() != "":
                buf.append(lines[i])
                i += 1
            body = "\n".join(buf)
            if re.match(r"^#{1,6} ", body):
                kind, tag = "heading", f"h{len(body) - len(body.lstrip('#'))}"
            elif body.lstrip().startswith("|"):
                kind, tag = "table", "table"
            else:
                kind, tag = "paragraph", "p"
            blocks.append(Block(local_id=local_id, kind=kind, body=body,
                                tag=tag).with_hash())
            continue
        i += 1  # stray text: ignore
    return blocks


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("native", help="path to native storage HTML")
    parser.add_argument("--projection", help="write the projection here")
    parser.add_argument("--anchors", help="write the anchors JSON here")
    args = parser.parse_args(argv)

    projection, anchors = project(Path(args.native).read_text(encoding="utf-8"))
    if args.projection:
        Path(args.projection).write_text(projection, encoding="utf-8")
    else:
        sys.stdout.write(projection)
    if args.anchors:
        Path(args.anchors).write_text(
            json.dumps(anchors, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
