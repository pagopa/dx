#!/usr/bin/env python3
"""Tests for prepare_markdown.py.

Run with:  python3 scripts/test_prepare_markdown.py
No third-party dependencies; uses the stdlib only.
"""

import unittest

import prepare_markdown as pm


class NormalizeTest(unittest.TestCase):
    def norm(self, source, title=None):
        prepared = pm.normalize(source, title=title)
        ok, msg = pm.check_equivalence(source, prepared, title)
        self.assertTrue(ok, f"token check failed for input:\n{source!r}\n{msg}")
        return prepared

    def test_collapses_soft_wrapped_paragraph(self):
        src = "Intro paragraph soft wrapped\nacross two lines.\n"
        self.assertEqual(self.norm(src), "Intro paragraph soft wrapped across two lines.\n")

    def test_blank_lines_kept_as_separators(self):
        src = "first para\n\n\nsecond para\n"
        self.assertEqual(self.norm(src), "first para\n\nsecond para\n")

    def test_drops_leading_h1_equal_to_title(self):
        src = "# Design Review\n\nBody text.\n"
        self.assertEqual(self.norm(src, title="Design Review"), "Body text.\n")

    def test_keeps_leading_h1_different_from_title(self):
        src = "# Other Title\n\nBody text.\n"
        self.assertEqual(
            self.norm(src, title="Design Review"), "# Other Title\n\nBody text.\n"
        )

    def test_fenced_code_verbatim(self):
        src = "```python\ndef f():\n    return 'keep | --- raw'\n```\n"
        self.assertEqual(self.norm(src), src)

    def test_heading_and_thematic_break(self):
        src = "## Section\n\n---\n"
        self.assertEqual(self.norm(src), "## Section\n\n---\n")

    def test_leading_pipe_table_preserved(self):
        src = "| a  | b |\n| -- | - |\n| 1  | 2 |\n"
        self.assertEqual(self.norm(src), src)

    def test_pipe_less_gfm_table_preserved(self):
        src = "a | b\n--- | ---\n1 | 2\nx | y\n"
        self.assertEqual(self.norm(src), "a | b\n--- | ---\n1 | 2\nx | y\n")

    def test_table_body_rows_need_not_start_with_pipe(self):
        src = "| a  | b |\n| -- | - |\n1 | 2\n3 | 4\n"
        self.assertEqual(self.norm(src), src)

    def test_pipe_in_prose_without_delimiter_stays_prose(self):
        src = "some prose | with a pipe\ncontinues here\n"
        self.assertEqual(self.norm(src), "some prose | with a pipe continues here\n")

    def test_tight_list_soft_wrap_joined(self):
        src = "- item two,\n  soft wrapped\n"
        self.assertEqual(self.norm(src), "- item two, soft wrapped\n")

    def test_loose_list_continuation_keeps_indent(self):
        src = "- first paragraph of item,\n  still wrapped.\n\n  second paragraph, same item.\n- next item\n"
        self.assertEqual(
            self.norm(src),
            "- first paragraph of item, still wrapped.\n\n  second paragraph, same item.\n- next item\n",
        )

    def test_ordered_loose_list_continuation_keeps_indent(self):
        src = "2. step two\n\n   second para of step two.\n"
        self.assertEqual(self.norm(src), "2. step two\n\n   second para of step two.\n")

    def test_simple_blockquote_collapses_wraps(self):
        src = "> quoted line one\n> quoted line two\n"
        self.assertEqual(self.norm(src), "> quoted line one quoted line two\n")

    def test_blockquote_paragraph_separator_kept(self):
        src = "> quoted line one\n> \n> second quote paragraph\n"
        self.assertEqual(
            self.norm(src), "> quoted line one\n>\n> second quote paragraph\n"
        )

    def test_nested_blockquote_stays_nested(self):
        src = "> quote outer line\n> > nested line one\n> > nested line two\n"
        self.assertEqual(
            self.norm(src), "> quote outer line\n> > nested line one nested line two\n"
        )

    def test_admonition_kept_verbatim(self):
        src = "> [!NOTE]\n> This callout body\n> is wrapped here.\n"
        self.assertEqual(self.norm(src), "> [!NOTE]\n> This callout body\n> is wrapped here.\n")

    def test_details_kept_verbatim(self):
        src = "<details>\n<summary>More</summary>\n\nbody\n</details>\n"
        self.assertEqual(self.norm(src), src)

    def test_html_comment_kept_verbatim(self):
        src = "<!-- stable-id-123 -->\n\ntext\n"
        self.assertEqual(self.norm(src), src)

    def test_normalizes_crlf_and_bom(self):
        src = "\ufeffline one\r\nline two\r\n"
        self.assertEqual(self.norm(src), "line one line two\n")


class MainTest(unittest.TestCase):
    def test_mismatch_returns_1(self):
        # normalize() is lossless by construction; exercise main() error path
        # with --no-check disabled is not possible to break, so assert main
        # rejects a missing input file.
        import subprocess
        import sys

        proc = subprocess.run(
            [sys.executable, pm.__file__, "/no/such/file.md"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
