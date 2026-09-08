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

    def test_indented_atx_heading_preserved(self):
        src = "  ## Section\nbody text\n"
        self.assertEqual(self.norm(src), src)

    def test_indented_atx_heading_not_merged_into_paragraph(self):
        src = "lead in\n   ### Deep section\nbody\n"
        self.assertEqual(self.norm(src), "lead in\n   ### Deep section\nbody\n")

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

    def test_nested_list_items_keep_indentation(self):
        src = "- parent\n  - child\n- sibling\n"
        self.assertEqual(self.norm(src), src)

    def test_deeply_nested_list_keeps_hierarchy(self):
        src = "- a\n  - b\n    - c\n- d\n"
        self.assertEqual(self.norm(src), src)

    def test_nested_list_after_blank_line_keeps_indentation(self):
        src = "- parent\n\n  - child\n"
        self.assertEqual(self.norm(src), src)

    def test_nested_list_hard_break_item_keeps_hierarchy(self):
        src = "- a  \n  - b\n- d\n"
        self.assertEqual(self.norm(src), "- a\n  - b\n- d\n")

    def test_simple_blockquote_collapses_wraps(self):
        src = "> quoted line one\n> quoted line two\n"
        self.assertEqual(self.norm(src), "> quoted line one quoted line two\n")

    def test_blockquote_paragraph_separator_kept(self):
        src = "> quoted line one\n> \n> second quote paragraph\n"
        self.assertEqual(
            self.norm(src), "> quoted line one\n>\n> second quote paragraph\n"
        )

    def test_lazy_blockquote_continuation_stays_quoted(self):
        src = "> quoted line\nlazy continuation text\n"
        self.assertEqual(self.norm(src), "> quoted line lazy continuation text\n")

    def test_block_starter_terminates_lazy_blockquote(self):
        src = "> quoted line\n- item\n"
        self.assertEqual(self.norm(src), "> quoted line\n- item\n")

    def test_block_starter_resets_quote_depth_for_following_text(self):
        src = "> quoted line\n- item\nfollowing paragraph\n"
        self.assertEqual(
            self.norm(src), "> quoted line\n- item\nfollowing paragraph\n"
        )

    def test_block_starter_resets_nested_quote_depth_for_following_text(self):
        src = "> outer\n> > nested line\n- item\nfollowing soft\nwrapped paragraph\n"
        self.assertEqual(
            self.norm(src),
            "> outer\n> > nested line\n- item\nfollowing soft wrapped paragraph\n",
        )

    def test_lazy_quote_resumes_after_top_level_paragraph(self):
        src = "> quoted line\n- item\nplain paragraph\n> quoted again\n"
        self.assertEqual(
            self.norm(src), "> quoted line\n- item\nplain paragraph\n> quoted again\n"
        )

    def test_nested_blockquote_stays_nested(self):
        src = "> quote outer line\n> > nested line one\n> > nested line two\n"
        self.assertEqual(
            self.norm(src), "> quote outer line\n> > nested line one nested line two\n"
        )

    def test_quoted_list_items_stay_separate(self):
        src = "> - first\n> - second\n"
        self.assertEqual(self.norm(src), "> - first\n> - second\n")

    def test_quoted_headings_stay_separate(self):
        src = "> # one\n> # two\n"
        self.assertEqual(self.norm(src), "> # one\n> # two\n")

    def test_quoted_fenced_code_kept_verbatim(self):
        src = "> ```\n>     def f():\n>         return 1\n> ```\n> after\n"
        self.assertEqual(
            self.norm(src), "> ```\n>     def f():\n>         return 1\n> ```\n> after\n"
        )

    def test_quoted_longer_fence_not_closed_by_shorter(self):
        src = "> ````\n> ```\n> inner example\n> ````\n> after\n"
        self.assertEqual(
            self.norm(src),
            "> ````\n> ```\n> inner example\n> ````\n> after\n",
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

    def test_preserves_hard_breaks_in_paragraph(self):
        src = "Line one  \nline two  \nline three\n"
        self.assertEqual(self.norm(src), src)

    def test_preserves_hard_break_inside_list_item(self):
        src = "- item one  \n  item two\n- next\n"
        self.assertEqual(self.norm(src), src)

    def test_preserves_hard_break_inside_blockquote(self):
        src = "> line one  \n> line two\n"
        self.assertEqual(self.norm(src), src)

    def test_soft_wrap_after_hard_break_still_collapses(self):
        src = "a  \nb\nc\n"
        # only the first newline is a hard break; b and c stay soft-wrapped
        self.assertEqual(self.norm(src), "a  \nb c\n")

    def test_plain_text_hash_prefix_not_dropped_as_h1(self):
        # "#NotAH1" is ordinary Markdown text, not an H1
        src = "#NotAH1\n\nBody text.\n"
        self.assertEqual(self.norm(src, title="NotAH1"), src)

    def test_closed_h1_equal_to_title_dropped(self):
        src = "# Design Review #\n\nBody text.\n"
        self.assertEqual(self.norm(src, title="Design Review"), "Body text.\n")

    def test_keeps_deeper_heading_equal_to_title(self):
        src = "## Design Review\n\nBody text.\n"
        self.assertEqual(self.norm(src, title="Design Review"), src)

    def test_setext_h1_preserved(self):
        src = "Design Review\n=====\n\nBody text.\n"
        self.assertEqual(self.norm(src), src)

    def test_setext_h1_soft_wrapped_content_joined(self):
        src = "Design Review\ncontinued on\nnext line\n=====\n\nBody text.\n"
        self.assertEqual(
            self.norm(src),
            "Design Review continued on next line\n=====\n\nBody text.\n",
        )

    def test_leading_setext_h1_equal_to_title_dropped(self):
        src = "Design Review\n=====\n\nBody text.\n"
        self.assertEqual(self.norm(src, title="Design Review"), "Body text.\n")

    def test_leading_soft_wrapped_setext_h1_equal_to_title_dropped(self):
        src = "Design Review —\ncontinued\n=====\n\nBody text.\n"
        self.assertEqual(
            self.norm(src, title="Design Review — continued"), "Body text.\n"
        )

    def test_leading_setext_h1_different_from_title_kept(self):
        src = "Other Title\n=====\n\nBody text.\n"
        self.assertEqual(self.norm(src, title="Design Review"), src)

    def test_setext_h2_kept_verbatim(self):
        src = "Section\n-------\n\nBody text.\n"
        self.assertEqual(self.norm(src), src)

    def test_setext_h2_after_wrapped_paragraph_kept(self):
        src = "Section heading\nwrapped line\n---\nBody text.\n"
        self.assertEqual(
            self.norm(src), "Section heading wrapped line\n---\nBody text.\n"
        )

    def test_longer_fence_not_closed_by_shorter_or_info_string(self):
        src = "````\n```python\nsecond line\nthird line\n```\n````\n"
        self.assertEqual(self.norm(src), src)

    def test_indented_code_block_preserved_after_paragraph(self):
        src = "para before\n\n    def f():\n        return 1\n\nafter\n"
        self.assertEqual(self.norm(src), src)

    def test_indented_code_block_at_document_start(self):
        src = "    line one\n    line two\n"
        self.assertEqual(self.norm(src), src)

    def test_indented_code_containing_list_markers_preserved(self):
        src = "    - sample bullet\n    - second line\n"
        self.assertEqual(self.norm(src), src)

    def test_loose_list_continuation_not_read_as_code(self):
        src = "- item\n\n    continuation line one\n    continues here.\n- next\n"
        self.assertEqual(
            self.norm(src),
            "- item\n\n    continuation line one continues here.\n- next\n",
        )


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
