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
- collapses soft-wrapped prose into single lines per logical block, while
  keeping explicit Markdown hard breaks (a line ending with two or more
  spaces) as hard line breaks instead of folding them into the next line;
- preserves fenced code blocks byte-for-byte;
- preserves indented code blocks (four-space- or tab-indented paragraphs that
  do not continue a loose list item) line by line instead of soft-wrapping
  them;
- preserves GFM tables (leading `|` optional): a header row containing `|`
  that is immediately followed by a delimiter row (`--- | ---`) is kept as
  one line per table row, like tables whose rows already start with `|`;
- preserves headings (ATX ``#`` and Setext ``===``/``---``), thematic breaks,
  list markers and their indentation,
  keeping a loose list item's continuation paragraphs indented under the
  item instead of promoting them to the top level;
- preserves blockquotes and their nesting: consecutive lines at the same
  quote depth are joined into one line, while a change of depth (`> > …`)
  starts a nested quote line instead of being flattened into the parent; a
  lazy continuation (a plain line right after a quoted one, with no `>` of
  its own) stays inside the quote, while a real block starter ends it;
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
# An ATX heading: up to three leading spaces (the maximum CommonMark permits),
# 1-6 '#', then a space or tab (so "#NotAH1" is ordinary text, not a heading).
ATX_HEADING = re.compile(r"^ {0,3}#{1,6}[ \t]+")
# A level-1 ATX heading: up to 3 leading spaces, a single '#', then a space or
# tab (so "#Title" is ordinary text, not a heading). The optional closing '#'s
# are stripped by _atx_h1_text, never by this matcher.
ATX_H1 = re.compile(r"^ {0,3}#(?!#)[ \t]+(.*)$")
LIST_MARKER = re.compile(r"^[ \t]*(?:[-+*]|\d{1,3}[.)])[ \t]+")
THEMATIC_BREAK = re.compile(r"^[ \t]*(?:-[ \t]*){3,}$|^[ \t]*(?:\*[ \t]*){3,}$|^[ \t]*(?:_[ \t]*){3,}$")
# A Setext heading underline: one or more '=' (H1) or '-' (H2) alone on a line,
# immediately after the paragraph it underlines (up to 3 leading spaces).
SETEXT_UNDERLINE = re.compile(r"^ {0,3}(?P<bar>=+|-+)[ \t]*$")
HARD_BREAK = re.compile(r" {2,}[ \t]*$")
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


def _atx_h1_text(line: str) -> str | None:
    """Semantic text of a level-1 ATX heading, or None if the line is not one.

    Only a real level-1 ATX heading qualifies (``# Title``, ``# Title #``); a
    ``#Title`` run of plain text or a deeper ``## Heading`` never does. A
    trailing closing sequence of ``#``s preceded by whitespace is not content.
    """
    m = ATX_H1.match(line)
    if not m:
        return None
    content = re.sub(r"[ \t]+#{1,}[ \t]*$", "", m.group(1))
    content = content.strip()
    return content or None


def _leading_h1_line_count(lines: list[str], title: str) -> int:
    """Number of leading lines to drop when they form an H1 equal to ``title``.

    Recognizes a single ATX ``# Title`` line or a Setext H1: a run of prose
    lines immediately followed by an ``=`` underline (a ``-`` underline is an
    H2 and never matches a page title). Returns 0 when there is no such leading
    H1 or its text differs from ``title``.
    """
    if not lines or not title:
        return 0
    if _atx_h1_text(lines[0]) == title:
        return 1
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            return 0
        if SETEXT_UNDERLINE.match(line):
            break
        if (
            _is_heading(line)
            or _is_hr(line)
            or _is_list_marker(line)
            or _is_quote(line)
            or _is_fence(line)
            or _is_html_comment(line)
            or _is_details(line)
            or _is_table(line)
        ):
            return 0
        if re.match(r"[ \t]{4}", line):
            return 0
        i += 1
    if i == 0 or i >= len(lines):
        return 0
    m = SETEXT_UNDERLINE.match(lines[i])
    if not m or "-" in m.group("bar") or "=" not in m.group("bar"):
        return 0
    text = " ".join(lines[j].strip() for j in range(i)).strip()
    return i + 1 if text == title else 0


def _is_list_marker(line: str) -> bool:
    return bool(LIST_MARKER.match(line))


def _is_hr(line: str) -> bool:
    return bool(THEMATIC_BREAK.match(line))


def _is_html_comment(line: str) -> bool:
    return bool(HTML_COMMENT_START.match(line))


def _is_details(line: str) -> bool:
    return bool(DETAILS_OPEN.match(line))


def _split_quote(line: str) -> tuple[int, str] | None:
    """Split a blockquote line into (marker depth, body); None if not a quote.
    The body has leading/trailing whitespace stripped for prose folding."""
    parts = _split_quote_raw(line)
    if parts is None:
        return None
    return parts[0], parts[1].strip()


def _split_quote_raw(line: str) -> tuple[int, str] | None:
    """Like ``_split_quote`` but keeps the body's leading whitespace, so code
    content inside a quoted fence line survives verbatim."""
    m = re.match(r"^([ \t]*(?:>[ \t]?)+)(.*)$", line)
    if not m:
        return None
    return m.group(1).count(">"), m.group(2).rstrip()


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


def _hard_break(line: str) -> bool:
    """True when the physical line ends in an explicit Markdown hard break
    (two or more trailing spaces before the newline)."""
    return bool(HARD_BREAK.search(line))


def _is_indented(line: str) -> bool:
    """True when the line starts with at least one space or tab."""
    return bool(re.match(r"[ \t]+", line))


def _is_indented_code_block(block: list[str]) -> bool:
    """True when every line of a blank-separated block is indented code: at
    least four leading spaces, or a leading tab, on each line. Loose-list
    continuation paragraphs share that indentation but are prose; the caller
    excludes them with list context (see ``normalize``)."""
    if not block:
        return False
    for raw in block:
        m = re.match(r"[ \t]*", raw)
        indent = m.group(0) if m else ""
        if "\t" in indent:
            continue
        if len(indent) < 4:
            return False
    return True


def _logical_lines(buf: list[str], breaks: list[bool]) -> list[str]:
    """Collapse the buffered soft-wrapped lines of one item/paragraph into
    logical lines. ``breaks[i]`` marks an explicit hard break after ``buf[i]``:
    such a boundary closes the current logical line instead of folding the next
    physical line onto it. Every closed logical line except the last keeps two
    trailing spaces, so the hard break survives as Markdown syntax."""
    lines: list[str] = []
    cur: list[str] = []
    for i, part in enumerate(buf):
        cur.append(part)
        if breaks[i]:
            lines.append(" ".join(cur) + "  ")
            cur = []
    if cur:
        lines.append(" ".join(cur))
    if lines and breaks and breaks[-1]:
        # a hard break after the very last line is meaningless
        lines[-1] = lines[-1][:-2]
    return lines


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
            fence = m.group("fence")[0] if m else "`"
            open_len = len(m.group("fence")) if m else 3
            closing = re.compile(rf"^[ \t]*{re.escape(fence)}{{{open_len},}}[ \t]*$")
            push()
            code: list[str] = [line]
            i += 1
            while i < n:
                code.append(lines[i])
                if closing.match(lines[i]):
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
        qbrk: list[bool] = []
        cur_depth = -1
        # A top-level paragraph that follows an interrupting block starter (the
        # quote is over, so these lines must not be folded back into it). Its
        # soft-wrapped lines are joined when the paragraph ends.
        top: list[str] = []
        top_brk: list[bool] = []

        def flush_run() -> None:
            nonlocal buf
            if buf:
                for text in _logical_lines(buf, qbrk):
                    out.append("> " * cur_depth + text)
                buf = []
                qbrk.clear()

        def flush_top() -> None:
            nonlocal top
            if top:
                out.extend(_logical_lines(top, top_brk))
                top = []
                top_brk.clear()

        def _interrupts_quote_paragraph(line: str) -> bool:
            # A line that starts its own Markdown block (heading, rule, list,
            # fence, comment, collapsible) cannot be a lazy quote continuation:
            # it terminates the active quote paragraph and is emitted at the
            # top level instead of being folded into the quote.
            return bool(
                _is_heading(line)
                or _is_hr(line)
                or _is_list_marker(line)
                or _is_fence(line)
                or _is_html_comment(line)
                or _is_details(line)
            )

        def _body_starts_block(body: str) -> bool:
            # A quoted body that itself opens a Markdown block (heading, rule,
            # list item, fence, comment, collapsible) must stay a block of its
            # own at this depth; folding it with neighbouring text would merge
            # e.g. `> - a` and `> - b` into a single item.
            return bool(
                _is_heading(body)
                or _is_hr(body)
                or _is_list_marker(body)
                or _is_fence(body)
                or _is_html_comment(body)
                or _is_details(body)
            )

        i = 0
        n = len(block)
        while i < n:
            line = block[i]
            split = _split_quote(line)
            if split is None:
                # non-quote line inside a quote block: plain text is a lazy
                # paragraph continuation and stays quoted at the current depth,
                # while a real block starter ends the quote and is emitted at
                # the top level. Once an interrupter has been emitted the quote
                # is over: reset the depth so later plain lines build a normal
                # top-level paragraph instead of being quoted again.
                if _interrupts_quote_paragraph(line):
                    flush_run()
                    flush_top()
                    out.append(line.rstrip())
                    cur_depth = -1
                elif cur_depth < 0:
                    top.append(line.strip())
                    top_brk.append(_hard_break(line))
                else:
                    buf.append(line.strip())
                    qbrk.append(_hard_break(line))
                i += 1
                continue
            # a real quote marker line ends any pending top-level paragraph
            flush_top()
            depth, body = split
            if not body:
                # '>' alone separates paragraphs inside the quote
                flush_run()
                out.append(("> " * depth).rstrip())
                i += 1
                continue
            if _body_starts_block(body):
                # a body that opens its own block is emitted as its own line,
                # never folded with the surrounding paragraph at this depth
                flush_run()
                cur_depth = depth
                if _is_fence(body):
                    # keep the whole quoted fence verbatim: consume same-depth
                    # lines until a fence that closes THIS opener (same char,
                    # at least as long), preserving code indentation
                    fence = FENCE_OPEN.match(body)
                    ch = fence.group("fence")[0] if fence else "`"
                    open_len = len(fence.group("fence")) if fence else 3
                    closing = re.compile(
                        r"^[ \t]*" + re.escape(ch) + "{" + str(open_len) + ",}[ \t]*$"
                    )
                    prefix = "> " * depth
                    out.append(prefix + body)
                    i += 1
                    while i < n:
                        nxt = _split_quote_raw(block[i])
                        if nxt is None or nxt[0] != depth:
                            break
                        out.append(prefix + nxt[1])
                        i += 1
                        if closing.match(nxt[1]):
                            break
                    continue
                out.append(("> " * depth) + body)
                i += 1
                continue
            if depth != cur_depth:
                # a change of quote depth starts a (nested) quote line
                flush_run()
                cur_depth = depth
            buf.append(body)
            qbrk.append(_hard_break(line))
            i += 1
        flush_run()
        flush_top()
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
    breaks: list[bool] = []
    item_indent = ""
    item_margin = ""
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
            logical = _logical_lines(buf, breaks)
            for i, flushed in enumerate(logical):
                if flushed is None:
                    continue
                if i > 0:
                    # a hard break inside a list item or indented paragraph
                    # starts a new physical line: keep it nested
                    flushed = (item_indent if buf_is_list else lead_indent) + flushed
                elif buf_is_list and item_margin:
                    # a nested list item keeps the indentation of its marker,
                    # so `- parent` + `  - child` stay a hierarchy
                    flushed = item_margin + flushed
                elif not buf_is_list and lead_indent:
                    flushed = lead_indent + flushed
                out.append(flushed)
            buf = None
            buf_is_list = False
            breaks.clear()

    for line in block:
        if _is_heading(line) or _is_hr(line):
            emit()
            out.append(line.rstrip())
            continue
        # A Setext underline ('=' H1 / '-' H2) directly after an open prose
        # paragraph turns that paragraph into a heading. Keep the folded text
        # on one line and the underline on its own, instead of merging the
        # underline into the paragraph.
        if SETEXT_UNDERLINE.match(line) and buf is not None and not buf_is_list:
            emit()
            out.append(line.rstrip())
            continue
        if _is_list_marker(line):
            emit()
            marker = LIST_MARKER.match(line)
            lead = re.match(r"[ \t]*", line)
            margin = len(lead.group(0)) if lead else 0
            buf = [line.strip()]
            breaks = [_hard_break(line)]
            buf_is_list = True
            item_indent = " " * len(marker.group(0)) if marker else ""
            item_margin = " " * margin
            continue
        # plain text: start a paragraph or continue the open item/paragraph
        if buf is None:
            buf = [line.strip()]
            breaks = [_hard_break(line)]
            buf_is_list = False
        else:
            buf.append(line.strip())
            breaks.append(_hard_break(line))
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
    # optional: strip a leading H1 identical to the page title (ATX or Setext)
    if title:
        drop = _leading_h1_line_count(lines, title)
        if drop:
            lines = lines[drop:]
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
        # True while the previous block was a (loose) list item or one of its
        # continuation paragraphs: an indented block here belongs to that item
        # and must not be read as indented code.
        in_loose_item = False
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
                in_loose_item = False
                continue
            block: list[str] = []
            while i < n and seg[i].strip():
                block.append(seg[i])
                i += 1
            # Indented code (>= 4 leading spaces/tab on every line) is kept
            # line by line — unless it is a loose list item's continuation
            # paragraph, which shares the indentation but stays prose.
            if _is_indented_code_block(block) and not in_loose_item:
                out.extend(block)  # verbatim, indentation and line breaks kept
                in_loose_item = False
                continue
            out.extend(_process_plain_block(block))
            in_loose_item = _is_list_marker(block[0]) or (
                in_loose_item and _is_indented(block[0])
            )
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
        drop = _leading_h1_line_count(src_lines, title)
        if drop:
            src_lines = src_lines[drop:]
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
