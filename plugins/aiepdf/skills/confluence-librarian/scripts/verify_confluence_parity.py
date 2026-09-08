#!/usr/bin/env python3
"""Deterministic, token-cheap content-parity check between a prepared Markdown
file and the body stored on Confluence.

Run this AFTER publishing/updating, with the stored body saved to a local file
(do NOT read the whole stored body into the agent's reasoning context):

    python3 scripts/verify_confluence_parity.py <prepared>.md <stored>.md

Semantics (mirror the skill's content-parity rule):

- compares token streams ignoring whitespace and structural markup that carries
  no content: HTML/XML tags are dropped and entities decoded on prose lines (so
  the stored body may come back as Markdown or HTML), and blockquote '>'
  markers are ignored only where Markdown treats them as structure — a
  line-leading marker outside fenced code. Content inside a fenced code block,
  or inside an HTML `<pre>`/`<code>` element (where Confluence escapes code
  text, e.g. `&lt;signature&gt;`), is compared verbatim — entity-decoded but
  never tag-stripped — and a literal '>' that is real content (for example a
  comparison in code) is never dropped;
- does NOT treat emphasis delimiters, table separators, or other cosmetic
  Markdown re-normalization as a failure — such a delta is reported as
  `cosmetic-only` when the content tokens still align after dropping a
  delimiter that wraps a token on both sides (never an unmatched leading
  underscore), a table row's outer border pipes, and table separator cells;
- stable HTML-comment markers (`<!-- id: … -->`) are stripped only from the
  prose path — never inside a fenced code block or an HTML `<pre>`/`<code>`
  element, where a literal comment is code content — because Confluence may
  drop such a marker on a write route (a platform limitation; the marker stays
  in the prepared representation). A marker that survives only as escaped
  visible text (`\<!--`, `&lt;!-- … --&gt;`) is a failure, and so is an
  unexpected or altered stable marker found in the stored body. Any other HTML
  comment is ordinary content and a drop or change to it is a content diff.

Output is deliberately compact: a verdict line, then at most ``--max-context``
mismatch windows (10 tokens either side), never the whole documents. Exit codes:
0 parity OK, 1 real content/comment mismatch found, 2 usage error.

The check cannot prove Markdown structure survived (tables, list-item
indentation, blockquote nesting, macro nodes), and because it strips tags and
whitespace it cannot even flag pure structural loss — a macro such as an
expand/callout flattened to prose can still read PARITY_OK. Confirm constructs
that must survive with an independent structural check (for example count the
macro nodes in the stored body), and inspect other structure in the regions
this tool flags.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

_STABLE_COMMENT = re.compile(r"<!--\s*id\s*:")
# A genuine stable-comment marker block (`<!-- id: … -->`); stripped from BOTH
# sides before the token comparison, because Confluence does not retain HTML
# comments on every write route. Only these markers are ignored, and only where
# they are real comments: code regions are stashed first, so a literal
# `<!-- … -->` inside code stays content. Escaped forms (`\<!--`, `&lt;!--`)
# do not match and stay visible as content, so mangled markers are reported.
_STABLE_COMMENT_BLOCK = re.compile(r"<!--\s*id\s*:.*?-->", re.S)
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
# Open/close tags of the HTML elements whose text is code (`<pre>`/`<code>`).
_CODE_OPEN = re.compile(r"</?(?:pre|code)(?:\s[^>]*)?>", re.I)
# An HTML `<pre>…</pre>` or `<code>…</code>` region. Confluence HTML exports
# escape code text inside them (`<signature>` becomes `&lt;signature&gt;`), so
# the text is code content: entity-decoded, never treated as structural tags.
_CODE_REGION = re.compile(
    r"<pre(?:\s[^>]*)?>(?P<pre>.*?)</pre>"
    r"|<code(?:\s[^>]*)?>(?P<code>.*?)</code>",
    re.I | re.S,
)


def _norm_newlines(text: str) -> str:
    if text.startswith("\ufeff"):
        text = text[1:]
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _strip_structural(text: str, *, cosmetic: bool = False) -> str:
    """Reduce a body (prepared Markdown or a Confluence Markdown/HTML export) to
    comparable content text. Fenced code blocks and HTML `<pre>`/`<code>`
    elements are protected first: their text is kept verbatim (fence content
    as-is, HTML code text entity-decoded so ``&lt;signature&gt;`` becomes
    ``<signature>``) and never mistaken for storage markup. Stable comment
    markers are then removed — only outside code, where they are real comments
    rather than code content. Remaining prose lines drop line-leading
    blockquote markers, strip structural HTML/XML tags, and finally decode HTML
    entities — in that order, so a decoded tag inside prose text
    (``&lt;b&gt;`` meant literally) is not stripped. With ``cosmetic=True`` the
    prose path also drops a table row's single outer border pipes, so rows that
    differ only in whether they carry the leading/trailing ``|`` still match."""
    protected: list[str] = []

    def placeholder(content: str) -> str:
        protected.append(content)
        return f" \x00{len(protected) - 1}\x00 "

    def stash_fences(text: str) -> str:
        """Pull fenced code blocks out of the prose path: their content is
        verbatim and must never be tag-stripped, quote-marked, or decoded."""
        lines = text.split("\n")
        out: list[str] = []
        i = 0
        n = len(lines)
        while i < n:
            raw = lines[i]
            m = _FENCE.match(raw)
            if m:
                ch = m.group("fence")[0]
                count = len(m.group("fence"))
                closing = re.compile(
                    r"^[ \t]*" + re.escape(ch) + "{" + str(count) + ",}[ \t]*$"
                )
                content: list[str] = []
                i += 1
                while i < n:
                    if closing.match(lines[i]):
                        i += 1
                        break
                    content.append(lines[i])
                    i += 1
                out.append(placeholder("\n".join(content)))
                continue
            out.append(raw)
            i += 1
        return "\n".join(out)

    def stash_code_elements(text: str) -> str:
        """Pull HTML ``<pre>``/``<code>`` regions out of the prose path. Their
        text is code content: entity-decoded (Confluence HTML escapes it) but
        never stripped as structural markup."""
        def repl(m: re.Match[str]) -> str:
            inner = m.group("pre") if m.group("pre") is not None else m.group("code")
            inner = _CODE_OPEN.sub("", inner)  # drop the wrapper tags themselves
            inner = html.unescape(inner).replace("\u00a0", " ")
            return placeholder(inner)
        return _CODE_REGION.sub(repl, text)

    text = stash_fences(text)
    text = stash_code_elements(text)
    # stable comment markers are ignored on both sides (Confluence may drop
    # them); code regions are already stashed, so a marker-looking comment
    # inside code is never removed here. The retained marker set is compared
    # separately in main().
    text = _STABLE_COMMENT_BLOCK.sub(" ", text)

    out: list[str] = []
    for raw in text.split("\n"):
        line = _LEAD_BLOCKQUOTE.sub("", raw)
        line = _HTML_TAG.sub(" ", line)
        line = html.unescape(line).replace("\u00a0", " ")
        if cosmetic:
            s = line.strip()
            if s.startswith("|"):
                s = s[1:]
            if s.endswith("|"):
                s = s[:-1]
            # a pure table-separator row (`---`, `:---:`, `| --- | --- |`):
            # its pipes are layout too, so separator rows that only differ in
            # cell formatting compare equal after the cells themselves drop
            if re.fullmatch(r"[|\-: \t]*", s) and "-" in s:
                s = re.sub(r"\|", " ", s)
            line = s
        out.append(line)

    def restore(m: re.Match[str]) -> str:
        return protected[int(m.group(1))]

    return re.sub(r"\x00(\d+)\x00", restore, "\n".join(out))


def token_stream(text: str) -> list[str]:
    """Non-whitespace content tokens with structural markup removed."""
    return _strip_structural(text).split()


def first_delta(expected: list[str], stored: list[str]) -> int:
    for i, (a, b) in enumerate(zip(expected, stored, strict=False)):
        if a != b:
            return i
    return min(len(expected), len(stored))


# Emphasis/code delimiters, longest first; only a wrapper that opens AND closes
# on the same token is cosmetic.
_EMPH_DELIMS = ("**", "__", "``", "*", "_", "`")


def _cosmetic_tokens(text: str) -> list[str]:
    """Content tokens with cosmetic Markdown re-normalization applied: table
    separator cells and ATX heading markers dropped, a table row's outer border
    pipes removed, and emphasis delimiters removed only when they wrap the
    token on both sides (so an identifier change like ``_private`` -> ``private``
    stays a content difference)."""
    out: list[str] = []
    for token in _strip_structural(text, cosmetic=True).split():
        # ATX heading markers ('#', '##', ...) and table-delimiter cells
        # ('---', ':---:', '|----|') are layout, not content
        if (token and set(token) <= {"#"} and len(token) <= 6) or _DELIM_CELL.fullmatch(token):
            continue
        t = token
        changed = True
        while changed and t:
            changed = False
            for marker in _EMPH_DELIMS:
                if len(t) > 2 * len(marker) and t.startswith(marker) and t.endswith(marker):
                    t = t[len(marker):-len(marker)]
                    changed = True
                    break
        if t:
            out.append(t)
    return out


def is_cosmetic_only(expected: str, stored: str) -> bool:
    """True when two bodies align after dropping markdown cosmetics only."""
    return _cosmetic_tokens(expected) == _cosmetic_tokens(stored)


def find_markers(expected: str) -> list[str]:
    out: list[str] = []
    for line in expected.splitlines():
        m = _STABLE_COMMENT.search(line)
        if m:
            out.append(line.strip())
    return out


def _marker_key(marker: str) -> str:
    """Canonical identity of a stable marker (runs of whitespace collapsed), so
    a comment re-emitted with different internal spacing is not mistaken for a
    different marker."""
    return re.sub(r"\s+", " ", marker.strip())


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
        expected_text = _norm_newlines(
            Path(args.expected).read_text(encoding="utf-8")
        )
        stored_text = _norm_newlines(Path(args.stored).read_text(encoding="utf-8"))
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    exp_tokens = token_stream(expected_text)
    sto_tokens = token_stream(stored_text)

    issues: list[str] = []
    notes: list[str] = []
    expected_markers = find_markers(expected_text)
    for marker in expected_markers:
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
    # Expected markers may legitimately be absent (dropped), but the stored body
    # must never contain a stable marker with no prepared counterpart: that is
    # an altered/corrupted marker (e.g. `<!-- id: x -->` -> `<!-- id: y -->`),
    # which the token streams alone cannot see because both are stripped.
    expected_marker_set = {_marker_key(m) for m in expected_markers}
    for marker in find_markers(stored_text):
        if _marker_key(marker) not in expected_marker_set:
            issues.append(
                f"unexpected/altered comment marker in stored body: {marker}"
            )

    if exp_tokens == sto_tokens:
        print(f"PARITY_OK tokens={len(exp_tokens)}")
        for issue in issues:
            print("ISSUE " + issue)
        for note in notes:
            print("NOTE " + note)
        return 1 if issues else 0

    delta = first_delta(exp_tokens, sto_tokens)
    cosmetic = is_cosmetic_only(expected_text, stored_text)

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
