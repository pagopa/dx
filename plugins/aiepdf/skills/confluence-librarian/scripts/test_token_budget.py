#!/usr/bin/env python3
"""Token-budget test for the projection spike, on a real large page.

Run:  python3 -m unittest test_token_budget -v   (from this directory)

The claim under test: the cost of an edit is proportional to the *change*, not
to the page. A one-cell change on a ~70 KB page must compile to a single small
`replaceNode` on the cell's node, whose serialized payload is a negligible
fraction of the native body — and the same change size must hold regardless of
which fixture it is applied to.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import compile_patch as cp
import project_native as pn

FIXTURES = Path(__file__).parent / "fixtures"
SMALL = FIXTURES / "native-3313926515.html"
LARGE = FIXTURES / "native-3319005192.html"


def _first_editable_table(ok, anchors):
    """Return (table_block, first data cell anchor) for a table with data rows."""
    for block in ok:
        if block.kind != "table":
            continue
        anchor = next(
            (b for b in anchors["blocks"] if b["localId"] == block.local_id), None
        )
        if anchor and anchor.get("cells") and len(anchor["cells"]) >= 2:
            return block, anchor["cells"][1][0]
    raise AssertionError("no editable table found in fixture")


def _change_first_cell(block, value):
    lines = block.body.splitlines()
    cells = lines[2].strip().strip("|").split("|")
    cells[0] = f" {value} "
    lines[2] = "|" + "|".join(cells) + "|"
    block.body = "\n".join(lines)


class TokenBudgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.large_native = LARGE.read_text(encoding="utf-8")
        cls.large_proj, cls.large_anchors = pn.project(cls.large_native)
        cls.small_native = SMALL.read_text(encoding="utf-8")
        cls.small_proj, cls.small_anchors = pn.project(cls.small_native)

    def test_large_fixture_projects_and_is_deterministic(self):
        proj2, anchors2 = pn.project(self.large_native)
        self.assertEqual(self.large_proj, proj2)
        self.assertEqual(
            json.dumps(self.large_anchors, sort_keys=True),
            json.dumps(anchors2, sort_keys=True),
        )

    def test_projection_is_much_smaller_than_native(self):
        # The projection drops per-node data-local-id attributes (kept in the
        # anchors sidecar), so a review pass is cheaper than the raw body.
        self.assertLess(len(self.large_proj), len(self.large_native) * 0.35)

    def test_unchanged_large_page_sends_nothing(self):
        self.assertEqual(
            cp.compile_patch(self.large_proj, self.large_proj, self.large_anchors), []
        )

    def test_one_cell_change_on_large_page_is_a_tiny_patch(self):
        blocks = cp.parse_projection(self.large_proj)
        table, target = _first_editable_table(blocks, self.large_anchors)
        _change_first_cell(table, "2026-09-09")
        new_md = pn.serialize(blocks)

        edits = cp.compile_patch(self.large_proj, new_md, self.large_anchors)
        self.assertEqual(len(edits), 1, edits)
        self.assertEqual(edits[0]["name"], "replaceNode")
        self.assertEqual(edits[0]["localId"], target["nodeId"])

        payload = len(json.dumps(edits))
        print(
            f"\n  large page: native={len(self.large_native)}B "
            f"projection={len(self.large_proj)}B patch={payload}B "
            f"({100 * payload / len(self.large_native):.2f}% of native)"
        )
        self.assertLess(payload, 0.01 * len(self.large_native))

    def test_patch_size_is_page_independent(self):
        # The same edit on a 8 KB page and on a 71 KB page costs about the same.
        def cell_patch(proj, anchors):
            blocks = cp.parse_projection(proj)
            table, _ = _first_editable_table(blocks, anchors)
            _change_first_cell(table, "CHANGED")
            return cp.compile_patch(proj, pn.serialize(blocks), anchors)

        small = cell_patch(self.small_proj, self.small_anchors)
        large = cell_patch(self.large_proj, self.large_anchors)
        self.assertEqual(len(small), 1)
        self.assertEqual(len(large), 1)
        ratio = len(json.dumps(small)) / len(json.dumps(large))
        self.assertLess(max(ratio, 1 / ratio), 1.5, (small, large))


if __name__ == "__main__":
    unittest.main(verbosity=2)
