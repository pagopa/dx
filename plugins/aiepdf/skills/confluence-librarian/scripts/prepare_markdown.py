#!/usr/bin/env python3
"""Deterministically prepare a Markdown file for Confluence import.

The Confluence editor stores body content, not presentation line-wraps. A
Markdown file whose prose is soft-wrapped for readability must therefore be
normalized to one logical line per paragraph/item before import, otherwise
wrapped lines can become accidental paragraphs, bullets, or hard breaks.

This script does exactly that normalization, deterministically:

- normalizes line endings (CRLF/CR -> LF) and strips a UTF-8 BOM;
- optionally drops a leading H1 whose text equals the page title
  (--title), so Confluence does not render the title twice;
- collapses soft-wrapped prose into single lines per logical block;
- preserves fenced code blocks byte-for-byte;
- preserves GFM tables (leading `|` optional): a header row containing `|`
  that is immediately followed by a delimiter row (`--- | ---`) is kept as
  one line per table row, like tables whose rows already start with `|`;
- preserves headings, thematic breaks, list markers and their indentation,
  keeping a loose list item's continuation paragraphs indented under the
  item instead of promoting them to the top level;
- preserves blockquotes and their nesting: consecutive lines at the same
  quote depth are joined into one line, while a change of depth (`> > …`)
  starts a nested quote line instead of being flattened into the parent;
- keeps collapsible HTML blocks (`<details>`/`<summary>`) verbatim, so a
  section intended as an expandable "a comparsa" section on Confluence is not
  flattened by the soft-wrap pass;
- keeps GitHub-style admonitions (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`,
  `> [!CAUTION]`, …) verbatim — label and soft-wrapped body alike — so the
  publisher can map the whole callout to a Confluence
  `info`/`tip`/`warning`/`error` macro instead of losing it;
- keeps single-line HTML comments and blank lines as paragraph separators
  (collapsing runs to one);
- self-checks that no non-whitespace token was lost (--check, default on),
  treating blockquote '>' markers as structural, not content.

Exit codes: 0 success, 1 failure (check mismatch or bad args), 2 usage error.

Usage:
  prepare_markdown.py [--title "PAGE TITLE"] [--no-check] [--inplace]
                      input.md [output.md]

  With no output path the normalized Markdown is written to stdout. With
  --inplace the input file is overwritten (output path is ignored).

The check is a safety net only: it verifies that no non-whitespace token was
deleted or reordered. It cannot prove Markdown *structure* survived
(indentation, quote depth, blank-line boundaries), which is why the structural
patterns above are normalized by explicit rules rather than by the check.
Confluence's own markdown export still re-normalizes cosmetics (table
separators to "| --- |", emphasis delimiters, escaping); verifying a published
page therefore compares *content*, not bytes.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

FENCE_OPEN = re.compile(r"^(?P<indent>[ \t]*)(?P<fence>`{3,}|~{3,})")
BLOCKQUOTE = re.compile(r"^[ \t]*> ?")
TABLE_ROW = re.compile(r"^[ \t]*\|")
TABLE_DELIM = re.compile(r"^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$")
ATX_HEADING = re.compile(r"^#{1,6}[ \t]+")
LIST_MARKER = re.compile(r"^[ \t]*(?:[-+*]|\d{1,3}[.)])[ \t]+")
THEMATIC_BREAK = re.compile(r"^[ \t]*(?:-[ \t]*){3,}$|^[ \t]*(?:\*[ \t]*){3,}$|^[ \t]*(?:_[ \t]*){3,}$")
HTML_COMMENT_START = re.compile(r"^[ \t]*<!--")
HTML_COMMENT_END = "-->"  # must appear on the same logical line or before a blank
DETAILS_OPEN = re.compile(r"^[ \t]*<details\b", re.I)
DETAILS_CLOSE = "</details>"
ADMONITION_OPEN = re.compile(r"^[ \t]*> ?\[!(NOTE|TIP|INFO|IMPORTANT|WARNING|CAUTION|DANGER)\][ \t]*$", re.I)
ADMONITION_LABEL = re.compile(r"^[ \t]*> ?\[!(NOTE|TIP|INFO|IMPORTANT|WARNING|CAUTION|DANGER)\]", re.I)


def _norm_newlines(text: str) -> str:
    if text.startswith("\ufeff"):
        text = text[1:]
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _is_fence(line: str) -> bool:
    return bool(FENCE_OPEN.match(line))


def _is_table(line: str) -> bool:
    return bool(TABLE_ROW.match(line))


def _is_quote(line: str) -> bool:
    return bool(BLOCKQUOTE.match(line))


def _is_heading(line: str) -> bool:
    return bool(ATX_HEADING.match(line))


def _is_list_marker(line: str) -> bool:
    return bool(LIST_MARKER.match(line))


def _is_hr(line: str) -> bool:
    return bool(THEMATIC_BREAK.match(line))


def _is_html_comment(line: str) -> bool:
    return bool(HTML_COMMENT_START.match(line))


def _is_details(line: str) -> bool:
    return bool(DETAILS_OPEN.match(line))


def _split_quote(line: str) -> tuple[int, str] | None:
    """Split a blockquote line into (marker depth, body); None if not a quote."""
    m = re.match(r"^([ \t]*(?:>[ \t]?)+)(.*)$", line)
    if not m:
        return None
    return m.group(1).count(">"), m.group(2).strip()


def _is_table_delim(line: str) -> bool:
    return "|" in line and bool(TABLE_DELIM.match(line))


def _is_table_row(line: str) -> bool:
    """True if a line can continue a GFM table block already in progress."""
    if not line.strip():
        return False
    if (
        _is_heading(line)
        or _is_hr(line)
        or _is_quote(line)
        or _is_fence(line)
        or _is_list_marker(line)
        or _is_html_comment(line)
        or _is_details(line)
    ):
        return False
    return _is_table(line) or "|" in line


def _table_start(seg: list[str], i: int) -> bool:
    """True if seg[i] begins a table block: a row starting with '|', or a
    header row containing '|' immediately followed by a delimiter row."""
    line = seg[i]
    if not line.strip():
        return False
    if _is_table(line):
        return True
    if i + 1 < len(seg) and "|" in line and _is_table_delim(seg[i + 1]):
        return not (
            _is_heading(line)
            or _is_hr(line)
            or _is_quote(line)
            or _is_fence(line)
            or _is_list_marker(line)
            or _is_html_comment(line)
            or _is_details(line)
        )
    return False


def _flush(buf: list[str] | None) -> str | None:
    """Collapse the accumulated soft-wrapped lines of one item/paragraph."""
    if buf is None:
        return None
    joined = " ".join(x.strip() for x in buf)
    return joined if joined else None


def _split_top_level(text: str) -> list[list[str]]:
    """Split text into maximal segments that are either entirely code/comment
    (kept verbatim) or entirely normal markdown (processed blockwise)."""
    lines = text.split("\n")
    segments: list[list[str]] = []
    cur: list[str] = []
    i = 0
    n = len(lines)

    def push():
        if cur:
            segments.append(list(cur))
            cur.clear()

    while i < n:
        line = lines[i]
        if _is_fence(line):
            m = FENCE_OPEN.match(line)
            fence = m.group("fence")[0]
            push()
            code: list[str] = [line]
            i += 1
            closed = False
            while i < n:
                code.append(lines[i])
                if re.match(rf"^[ \t]*{re.escape(fence)}{{3,}}", lines[i]):
                    closed = True
                    i += 1
                    break
                i += 1
            segments.append(code)
            continue
        if _is_html_comment(line):
            push()
            seg: list[str] = []
            while i < n:
                seg.append(lines[i])
                if HTML_COMMENT_END in lines[i]:
                    i += 1
                    break
                i += 1
            segments.append(seg)
            continue
        if _is_details(line):
            push()
            seg = []
            while i < n:
                seg.append(lines[i])
                if DETAILS_CLOSE in lines[i]:
                    i += 1
                    break
                i += 1
            segments.append(seg)
            continue
        cur.append(line)
        i += 1
    push()
    return segments


def _process_plain_block(block: list[str]) -> list[str]:
    """Normalize one contiguous non-blank markdown block (no fences, comments,
    or tables inside). Handles headings, thematic breaks, lists, paragraphs,
    and blockquotes."""
    if not block:
        return []
    # Blockquote block: every non-empty line starts with '>'.
    if _is_quote(block[0]):
        # GitHub-style admonition "> [!LABEL]" stays verbatim (label and body),
        # so the publisher can map the whole callout to a Confluence macro.
        if ADMONITION_OPEN.match(block[0]):
            out = [line.rstrip() for line in block]
            while out and out[-1] == ">":
                out.pop()
            return out
        out: list[str] = []
        buf: list[str] = []
        cur_depth = -1

        def flush_run() -> None:
            nonlocal buf
            if buf:
                out.append("> " * cur_depth + " ".join(buf))
                buf = []

        for line in block:
            split = _split_quote(line)
            if split is None:
                # non-quote line inside a quote block (lazy continuation):
                # treat as new content
                flush_run()
                out.append(line.rstrip())
                continue
            depth, body = split
            if not body:
                # '>' alone separates paragraphs inside the quote
                flush_run()
                out.append(("> " * depth).rstrip())
                continue
            if depth != cur_depth:
                # a change of quote depth starts a (nested) quote line
                flush_run()
                cur_depth = depth
            buf.append(body)
        flush_run()
        # drop quote markers left over by a lone '>' at the very end
        while out:
            parts = _split_quote(out[-1])
            if parts is None or parts[1]:
                break
            out.pop()
        return out

    out = []
    buf: list[str] | None = None
    buf_is_list = False
    # An indented paragraph block (after a blank line, no list marker) is a
    # loose list item's continuation paragraph. Keep its indentation instead
    # of stripping it, so it is not promoted to the top level.
    lead_indent = ""
    if not (_is_heading(block[0]) or _is_hr(block[0]) or _is_list_marker(block[0])):
        m = re.match(r"[ \t]*", block[0])
        lead_indent = m.group(0) if m else ""

    def emit():
        nonlocal buf, buf_is_list
        if buf is not None:
            flushed = _flush(buf)
            if flushed is not None:
                if not buf_is_list and lead_indent:
                    flushed = lead_indent + flushed
                out.append(flushed)
            buf = None
            buf_is_list = False

    for line in block:
        if _is_heading(line) or _is_hr(line):
            emit()
            out.append(line.rstrip())
            continue
        if _is_list_marker(line):
            emit()
            buf = [line.rstrip()]
            buf_is_list = True
            continue
        # plain text: start a paragraph or continue the open item/paragraph
        if buf is None:
            buf = [line.strip()]
            buf_is_list = False
        else:
            buf.append(line.strip())
    emit()
    return out


def normalize(text: str, title: str | None = None) -> str:
    text = _norm_newlines(text)
    # drop leading blank lines
    lines = text.split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    # optional: strip a leading H1 identical to the page title
    if title:
        if lines and lines[0].lstrip().startswith("#") and lines[0].lstrip()[1:].strip() == title:
            lines = lines[1:]
            while lines and not lines[0].strip():
                lines.pop(0)
    text = "\n".join(lines)

    out: list[str] = []
    for seg in _split_top_level(text):
        if seg and _is_fence(seg[0]):
            out.extend(seg)  # verbatim, fences + content
            continue
        if seg and _is_html_comment(seg[0]):
            out.extend(seg)  # verbatim
            continue
        if seg and _is_details(seg[0]):
            out.extend(seg)  # verbatim: collapsible blocks keep their structure
            continue
        # normal markdown segment: walk line by line, blockwise
        i = 0
        n = len(seg)
        while i < n:
            line = seg[i]
            if not line.strip():
                out.append("")
                i += 1
                continue
            if _table_start(seg, i):
                while i < n and seg[i].strip() and _is_table_row(seg[i]):
                    out.append(seg[i].rstrip())
                    i += 1
                continue
            block: list[str] = []
            while i < n and seg[i].strip():
                block.append(seg[i])
                i += 1
            out.extend(_process_plain_block(block))
    # collapse blank runs, drop leading/trailing blanks
    final: list[str] = []
    prev_blank = False
    for line in out:
        blank = not line.strip()
        if blank and prev_blank:
            continue
        final.append("")
        final[-1] = line
        prev_blank = blank
    while final and not final[-1].strip():
        final.pop()
    return "\n".join(final) + "\n"


def token_stream(text: str) -> list[str]:
    """Non-whitespace tokens; blockquote '>' markers are structural, ignored."""
    return [t for t in text.split() if t != ">"]


def check_equivalence(source: str, prepared: str, title: str | None) -> tuple[bool, str]:
    """Verify no content was lost. Compares token streams after stripping the
    same optional title H1 from the source."""
    src = _norm_newlines(source)
    src_lines = src.split("\n")
    while src_lines and not src_lines[0].strip():
        src_lines.pop(0)
    if title:
        if src_lines and src_lines[0].lstrip().startswith("#") and src_lines[0].lstrip()[1:].strip() == title:
            src_lines = src_lines[1:]
    src_tokens = token_stream("\n".join(src_lines))
    dst_tokens = token_stream(prepared)
    if src_tokens == dst_tokens:
        return True, f"OK: {len(dst_tokens)} content tokens preserved"
    i = 0
    while i < min(len(src_tokens), len(dst_tokens)) and src_tokens[i] == dst_tokens[i]:
        i += 1
    ctx_src = " ".join(src_tokens[max(0, i - 8) : i + 8])
    ctx_dst = " ".join(dst_tokens[max(0, i - 8) : i + 8])
    return (
        False,
        f"MISMATCH at token {i}: source={len(src_tokens)} prepared={len(dst_tokens)}\n"
        f"  source   ...{ctx_src}...\n"
        f"  prepared ...{ctx_dst}...",
    )


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Normalize Markdown soft-wraps deterministically for Confluence import."
    )
    p.add_argument("input", help="input Markdown file (or '-' for stdin)")
    p.add_argument("output", nargs="?", help="output file (default: stdout)")
    p.add_argument("--title", help="page title; a leading H1 equal to it is dropped")
    p.add_argument("--no-check", action="store_true", help="skip the token-preservation check")
    p.add_argument("--inplace", action="store_true", help="overwrite the input file")
    args = p.parse_args(argv)

    if args.input == "-":
        source = sys.stdin.read()
    else:
        try:
            source = Path(args.input).read_text(encoding="utf-8")
        except FileNotFoundError:
            print(f"error: no such file: {args.input}", file=sys.stderr)
            return 1

    prepared = normalize(source, title=args.title)

    if not args.no_check:
        ok, msg = check_equivalence(source, prepared, args.title)
        if not ok:
            print(f"error: {msg}", file=sys.stderr)
            return 1

    if args.inplace:
        Path(args.input).write_text(prepared, encoding="utf-8")
    elif args.output:
        Path(args.output).write_text(prepared, encoding="utf-8")
    else:
        sys.stdout.write(prepared)
    return 0


if __name__ == "__main__":
    sys.exit(main())
