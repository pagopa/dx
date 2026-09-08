#!/usr/bin/env python3
"""Tests for verify_confluence_parity.py.

Run with:  python3 scripts/test_verify_confluence_parity.py
No third-party dependencies; uses the stdlib only.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import verify_confluence_parity as vp


class TokenStreamTest(unittest.TestCase):
    def test_blockquote_markers_structural_only_at_line_start(self):
        self.assertEqual(vp.token_stream("> quoted line one\n> line two\n"), ["quoted", "line", "one", "line", "two"])

    def test_nested_blockquote_markers_stripped(self):
        self.assertEqual(vp.token_stream("> outer\n> > nested\n"), ["outer", "nested"])

    def test_gt_inside_fenced_code_is_content(self):
        src = "```\nif a > b\n```\n\n> quoted line\nbody\n"
        tokens = vp.token_stream(src)
        self.assertIn(">", tokens)
        self.assertEqual(tokens.count(">"), 1)
        self.assertIn("quoted", tokens)
        self.assertIn("body", tokens)

    def test_comment_inside_code_fence_is_content(self):
        src = "para\n```\n<!-- TODO -->\n```\n"
        tokens = vp.token_stream(src)
        self.assertIn("<!--", tokens)
        self.assertIn("-->", tokens)
        self.assertIn("TODO", tokens)

    def test_stable_marker_stripped_from_prose_tokens(self):
        tokens = vp.token_stream("a\n<!-- id: x -->\nb\n")
        self.assertNotIn("id:", tokens)

    def test_html_tags_and_entities_collapse_to_text(self):
        stored = vp.token_stream("<p>Hello&nbsp;world</p>\n<p>second paragraph</p>\n")
        expected = vp.token_stream("Hello world\nsecond paragraph\n")
        self.assertEqual(expected, stored)

    def test_comparison_operator_against_html_storage(self):
        stored = vp.token_stream("<p>Sample:</p><pre><code>if a &gt; b</code></pre>")
        expected = vp.token_stream("Sample:\n```\nif a > b\n```")
        self.assertEqual(expected, stored)

    def test_table_delimiter_width_differs_between_sides(self):
        exp = "| a | b |\n-----------------------\n| 1 | 2 |"
        sto = "| a | b |\n| --- | --- |\n| 1 | 2 |"
        self.assertNotEqual(vp.token_stream(exp), vp.token_stream(sto))
        self.assertTrue(vp.is_cosmetic_only(exp, sto))

    def test_tag_like_code_token_inside_fence_is_content(self):
        src = "```\nx-psp-signature: <signature>\n```\n"
        tokens = vp.token_stream(src)
        self.assertIn("<signature>", tokens)

    def test_fence_content_entities_not_decoded(self):
        tokens = vp.token_stream("```\nif a &lt; b\n```\n")
        self.assertIn("&lt;", tokens)

    def test_html_tags_stripped_but_not_inside_fence(self):
        stored = vp.token_stream("<p>Intro:</p>\n```\n<signature>\n```\n")
        expected = vp.token_stream("Intro:\n```\n<signature>\n```\n")
        self.assertEqual(expected, stored)

    def test_html_pre_code_text_is_code_not_tags(self):
        stored = vp.token_stream(
            "<p>Sample:</p><pre><code>x-psp-signature: &lt;signature&gt;</code></pre>"
        )
        expected = vp.token_stream("Sample:\n```\nx-psp-signature: <signature>\n```")
        self.assertEqual(expected, stored)

    def test_multiline_html_pre_block_protected(self):
        stored = vp.token_stream(
            "<pre><code>if a &gt; b:\n    &lt;signature&gt;\n</code></pre>"
        )
        expected = vp.token_stream("```\nif a > b:\n    <signature>\n```")
        self.assertEqual(expected, stored)

    def test_inline_html_code_element_not_tag_stripped(self):
        stored = vp.token_stream("<p>Use <code>__init__</code> now</p>")
        self.assertIn("__init__", stored)


class MarkerTest(unittest.TestCase):
    MARKER = "<!-- id: x -->"

    def test_raw_comment_retained_is_ok(self):
        self.assertEqual(vp.marker_status(f"before {self.MARKER} after", self.MARKER), "ok")

    def test_fully_html_escaped_marker_is_escaped(self):
        stored = "rendered as visible text: &lt;!-- id: x --&gt;"
        self.assertEqual(vp.marker_status(stored, self.MARKER), "escaped")

    def test_half_escaped_marker_is_escaped(self):
        stored = "rendered as visible text: &lt;!-- id: x -->"
        self.assertEqual(vp.marker_status(stored, self.MARKER), "escaped")

    def test_backslash_escaped_marker_is_escaped(self):
        stored = r"rendered as visible text: \<!-- id: x -->"
        self.assertEqual(vp.marker_status(stored, self.MARKER), "escaped")

    def test_dropped_marker_is_missing(self):
        self.assertEqual(vp.marker_status("nothing here", self.MARKER), "missing")


class CliTest(unittest.TestCase):
    def _run(self, expected: str, stored: str):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            exp = root / "expected.md"
            sto = root / "stored.md"
            exp.write_text(expected, encoding="utf-8")
            sto.write_text(stored, encoding="utf-8")
            return subprocess.run(
                [sys.executable, vp.__file__, str(exp), str(sto)],
                capture_output=True,
                text=True,
            )

    def test_identical_content_parity_ok(self):
        proc = self._run("Hello world\n", "Hello world\n")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_OK", proc.stdout)

    def test_table_separator_roundtrip_is_cosmetic(self):
        expected = "| ID | Value |\n| --- | --- |\n| a | b |\n"
        stored = "| ID | Value |\n| ----------------- | ---- |\n| a | b |\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_COSMETIC", proc.stdout)

    def test_escaped_marker_fails(self):
        expected = "Hello\n<!-- id: x -->\nworld\n"
        stored = "Hello\n&lt;!-- id: x --&gt;\nworld\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("ISSUE escaped comment marker", proc.stdout)

    def test_unmatched_underscore_identifier_change_is_diff(self):
        expected = "set the _private field now\n"
        stored = "set the private field now\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("PARITY_DIFF", proc.stdout)

    def test_balanced_emphasis_delta_is_cosmetic(self):
        expected = "**bold** word\n"
        stored = "*bold* word\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_COSMETIC", proc.stdout)

    def test_table_outer_border_pipe_delta_is_cosmetic(self):
        expected = "a | b\n--- | ---\n1 | 2\n"
        stored = "| a | b |\n| --- | --- |\n| 1 | 2 |\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_COSMETIC", proc.stdout)

    def test_literal_comment_inside_code_fence_lost_is_a_diff(self):
        expected = "```\n<!-- TODO -->\n```\n"
        stored = "```\n\n```\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("PARITY_DIFF", proc.stdout)

    def test_literal_comment_inside_code_fence_kept_is_ok(self):
        expected = "```\n<!-- TODO -->\n```\n"
        stored = "```\n<!-- TODO -->\n```\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_OK", proc.stdout)

    def test_non_stable_comment_dropped_outside_code_is_a_diff(self):
        expected = "para\n<!-- TODO -->\nworld\n"
        stored = "para\nworld\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("PARITY_DIFF", proc.stdout)

    def test_altered_stable_marker_fails(self):
        expected = "a\n<!-- id: x -->\nb\n"
        stored = "a\n<!-- id: y -->\nb\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("unexpected/altered comment marker", proc.stdout)

    def test_stable_marker_dropped_is_platform_note(self):
        expected = "a\n<!-- id: x -->\nb\n"
        stored = "a\nb\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_OK", proc.stdout)
        self.assertIn("platform limitation", proc.stdout)

    def test_html_stored_body_comparison(self):
        expected = "Hello world\n"
        stored = "<p>Hello&nbsp;world</p>\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_OK", proc.stdout)

    def test_lost_code_token_inside_fence_is_a_diff(self):
        expected = "```\n<signature>\n```\n"
        stored = "```\n\n```\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("PARITY_DIFF", proc.stdout)

    def test_tag_like_code_roundtrip_is_ok(self):
        expected = "Sample:\n```\nx-psp-signature: <signature>\n```\n"
        stored = "Sample:\n```\nx-psp-signature: <signature>\n```\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_OK", proc.stdout)

    def test_html_exported_code_roundtrip_is_ok(self):
        expected = "Sample:\n```\nx-psp-signature: <signature>\n```\n"
        stored = (
            "<p>Sample:</p><pre><code>x-psp-signature: "
            "&lt;signature&gt;</code></pre>"
        )
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("PARITY_OK", proc.stdout)

    def test_code_lost_from_html_export_is_a_diff(self):
        expected = "```\n<signature>\n```\n"
        stored = "<pre><code></code></pre>\n"
        proc = self._run(expected, stored)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("PARITY_DIFF", proc.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
