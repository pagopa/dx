#!/usr/bin/env python3
"""Deterministic, token-cheap content-parity check between a prepared Markdown
file and the body stored on Confluence.

Run this AFTER publishing/updating, with the stored body saved to a local file
(do NOT read the whole stored body into the agent's reasoning context):

    python3 scripts/verify_confluence_parity.py <prepared>.md <stored>.md

Semantics (mirror the skill's content-parity rule):

- compares token streams ignoring whitespace and structural markup that carries
  no content: HTML/XML tags are dropped and entities decoded (so the stored
  body may come back as Markdown or HTML), and blockquote '>' markers are
  ignored only where Markdown treats them as structure — a line-leading marker
  outside fenced code. A literal '>' that is real content (for example a
  comparison in code) is never dropped;
- does NOT treat emphasis delimiters, table separators, or other cosmetic
  Markdown re-normalization as a failure — such a delta is reported as
  `cosmetic-only` when the content tokens still align;
- ignores stable HTML comment blocks on both sides (Confluence may drop them on
  a write route — that is a platform limitation, and the marker stays in the
  prepared representation) and fails only when a comment was **escaped into
  visible text** (`\\<!--`, `&lt;!-- … --&gt;`, in either half-escaped or fully
  HTML-escaped form) or real content differs.

Output is deliberately compact: a verdict line, then at most ``--max-context``
mismatch windows (10 tokens either side), never the whole documents. Exit codes:
0 parity OK, 1 real content/comment mismatch found, 2 usage error.

The check cannot prove Markdown structure survived (tables, list-item
indentation, blockquote nesting, macro nodes) — confirm those structurally
only in the regions this tool flags.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

_STABLE_COMMENT = re.compile(r"<!--\s*id\s*:")
# A genuine HTML comment block; stripped from BOTH sides before the token
# comparison, because Confluence does not retain HTML comments on every write
# route. Escaped forms (\\<!--, &lt;!--) do not match this and stay visible as
# content, so mangled markers are still reported as a failure.
_COMMENT_BLOCK = re.compile(r"<!--.*?-->", re.S)
# A fenced code block: content inside it is verbatim, so a line-leading '>'
# there is code, not a blockquote marker.
_FENCE = re.compile(r"^[ \t]*(?P<fence>`{3,}|~{3,})")
# A blockquote marker: '>' at the start of the line (up to 3 leading spaces),
# each optionally followed by a space/tab. Only these are structural.
_LEAD_BLOCKQUOTE = re.compile(r"^ {0,3}(?:>[ \t]?)+")
# Structural HTML/XML tags (including self-closing and attribute-carrying ones).
_HTML_TAG = re.compile(r"</?[a-zA-Z][^>]*>")
# A Markdown table-delimiter cell (e.g. ---, :---:, |----|): cosmetic only.
_DELIM_CELL = re.compile(r"\|?:?-+:?\|?")


def _norm_newlines(text: str) -> str:
    if text.startswith("\ufeff"):
        text = text[1:]
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _strip_structural(text: str) -> str:
    """Reduce a body (prepared Markdown or a Confluence Markdown/HTML export) to
    comparable content text: remove line-leading blockquote markers outside
    fenced code, drop fenced-code markers (opening/closing lines, including any
    info string) while keeping the code itself, decode HTML entities, and drop
    structural HTML/XML tags."""
    lines = text.split("\n")
    out: list[str] = []
    fence: tuple[str, int] | None = None
    for raw in lines:
        if fence is not None:
            ch, n = fence
            if re.match(r"^[ \t]*" + re.escape(ch) + "{" + str(n) + ",}[ \t]*$", raw):
                fence = None
                out.append("")
                continue
            out.append(raw)
            continue
        m = _FENCE.match(raw)
        if m:
            fence = (m.group("fence")[0], len(m.group("fence")))
            out.append("")
            continue
        out.append(_LEAD_BLOCKQUOTE.sub("", raw))
    text = html.unescape("\n".join(out)).replace("\u00a0", " ")
    return "\n".join(_HTML_TAG.sub(" ", ln) for ln in text.split("\n"))


def token_stream(text: str) -> list[str]:
    """Non-whitespace content tokens with structural markup removed."""
    return _strip_structural(text).split()


def first_delta(expected: list[str], stored: list[str]) -> int:
    for i, (a, b) in enumerate(zip(expected, stored, strict=False)):
        if a != b:
            return i
    return min(len(expected), len(stored))


def is_cosmetic_only(expected: list[str], stored: list[str]) -> bool:
    """True when content tokens align after stripping markdown cosmetics."""
    def strip(tokens: list[str]) -> list[str]:
        out = []
        for token in tokens:
            # drop ATX heading markers ('#', '##', ...) and table-delimiter
            # cells ('---', ':---:', '|----|'); neither is content
            if (token and set(token) <= {"#"} and len(token) <= 6) or _DELIM_CELL.fullmatch(token):
                continue
            t = token
            # drop emphasis/literal markers and leading table '|'
            while t[:2] in ("**", "__", "``") or t[:1] in ("*", "_", "`", "|"):
                t = t[1:]
            while t[-2:] in ("**", "__", "``") or t[-1:] in ("*", "_", "`", "|"):
                t = t[:-1]
            if t:
                out.append(t)
        return out
    return strip(expected) == strip(stored)


def find_markers(expected: str) -> list[str]:
    out: list[str] = []
    for line in expected.splitlines():
        m = _STABLE_COMMENT.search(line)
        if m:
            out.append(line.strip())
    return out


def marker_status(stored: str, marker: str) -> str:
    """Classify how a stable comment marker survived: ok/escaped/missing.

    ``ok`` means the raw HTML comment node is still present. ``escaped`` means
    the marker survived only as visible text — in any escaped rendering,
    including fully HTML-escaped forms such as ``&lt;!-- id: x --&gt;``. When
    neither the raw comment nor any decoded rendering of the marker is present
    the marker is ``missing`` (Confluence dropped it, a platform limitation).
    """
    normalized = stored.replace("\u00a0", " ")
    # ok: the marker still exists as a genuine HTML comment node. A backslash
    # or entity-escaped copy also contains the literal marker text, so require
    # it NOT to be escaped before classifying it as retained.
    if re.search(r"(?<!\\)" + re.escape(marker), normalized):
        return "ok"
    if marker in html.unescape(normalized):
        return "escaped"
    return "missing"


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Deterministic content-parity check between a prepared "
        "Markdown file and the Confluence-stored body."
    )
    p.add_argument("expected", help="prepared Markdown file")
    p.add_argument("stored", help="stored Confluence body saved to a file")
    p.add_argument("--max-context", type=int, default=3,
                   help="max mismatch windows to print (default: 3)")
    args = p.parse_args(argv)

    try:
        expected_text = Path(args.expected).read_text(encoding="utf-8")
        stored_text = Path(args.stored).read_text(encoding="utf-8")
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    exp_tokens = token_stream(_COMMENT_BLOCK.sub("", _norm_newlines(expected_text)))
    sto_tokens = token_stream(_COMMENT_BLOCK.sub("", _norm_newlines(stored_text)))

    issues: list[str] = []
    notes: list[str] = []
    for marker in find_markers(expected_text):
        status = marker_status(stored_text, marker)
        if status == "escaped":
            issues.append(f"escaped comment marker: {marker}")
        elif status == "missing":
            # Confluence may drop HTML comments outright on a given write route;
            # that is a platform limitation, not content loss (the marker stays
            # in the prepared representation). Only escaping it into visible
            # text is a failure.
            notes.append(
                f"comment marker dropped by Confluence (platform limitation): {marker}"
            )

    if exp_tokens == sto_tokens:
        print(f"PARITY_OK tokens={len(exp_tokens)}")
        for issue in issues:
            print("WARN " + issue)
        for note in notes:
            print("NOTE " + note)
        return 0

    delta = first_delta(exp_tokens, sto_tokens)
    cosmetic = is_cosmetic_only(exp_tokens, sto_tokens)

    print(
        f"PARITY_{'COSMETIC' if cosmetic else 'DIFF'} "
        f"expected_tokens={len(exp_tokens)} stored_tokens={len(sto_tokens)} "
        f"first_delta={delta}"
    )
    printed = 0
    i = delta
    n = min(len(exp_tokens), len(sto_tokens))
    while i < n and printed < args.max_context:
        if exp_tokens[i] != sto_tokens[i]:
            lo = max(0, i - 10)
            hi = min(n, i + 10)
            print(f"  at {i}: expected ...{' '.join(exp_tokens[lo:hi])}...")
            print(f"       stored ...{' '.join(sto_tokens[lo:hi])}...")
            printed += 1
            i = hi
        else:
            i += 1
    for issue in issues:
        print("  ISSUE " + issue)
    for note in notes:
        print("  NOTE " + note)

    return 0 if (cosmetic and not issues) else 1


if __name__ == "__main__":
    sys.exit(main())
