#!/usr/bin/env python3
"""Tests for the confluence-librarian projection spike (v0).

Run:  python3 -m unittest test_projection -v   (from this directory)

Covers the acceptance criteria of the first slice:
- projection + anchors are deterministic;
- every top-level block is represented and anchors are unique;
- an unchanged projection compiles to no edits (the no-op case);
- a paragraph edit compiles to exactly one replaceNode on that node;
- a table-cell edit compiles to a replaceNode on the cell's node, not the page;
- editing an opaque node is refused rather than silently losing fidelity.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import compile_patch as cp
import project_native as pn

FIXTURE = Path(__file__).parent / "fixtures" / "native-3313926515.html"


def _blocks(md: str):
    return cp.parse_projection(md)


class ProjectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.native = FIXTURE.read_text(encoding="utf-8")

    def setUp(self):
        self.projection, self.anchors = pn.project(self.native)

    def test_projection_is_deterministic(self):
        p2, a2 = pn.project(self.native)
        self.assertEqual(self.projection, p2)
        self.assertEqual(
            json.dumps(self.anchors, sort_keys=True),
            json.dumps(a2, sort_keys=True),
        )

    def test_every_top_level_block_is_covered(self):
        raw_blocks = pn.split_top_level(self.native)
        self.assertEqual(len(self.anchors["blocks"]), len(raw_blocks))
        ids = [b["localId"] for b in self.anchors["blocks"] if b["localId"]]
        self.assertEqual(len(ids), len(set(ids)), "anchor ids must be unique")

    def test_mix_of_kinds_and_opaque_verbatim(self):
        kinds = {b["kind"] for b in self.anchors["blocks"]}
        self.assertTrue({"heading", "paragraph", "table"} <= kinds)
        self.assertIn("native", kinds)  # <details> and the info panel
        # opaque raw must appear verbatim in the projection
        for block in self.anchors["blocks"]:
            if block["kind"] == "native":
                self.assertIn(f':::native {{#{block["localId"]}', self.projection)

    def test_noop_patch_is_empty(self):
        self.assertEqual(cp.compile_patch(self.projection, self.projection, self.anchors), [])

    def test_paragraph_edit_is_single_replace(self):
        blocks = _blocks(self.projection)
        para = next(b for b in blocks if b.kind == "paragraph")
        para.body = para.body + " EDITED"
        new_md = pn.serialize(blocks)
        edits = cp.compile_patch(self.projection, new_md, self.anchors)
        self.assertEqual(len(edits), 1)
        self.assertEqual(edits[0]["name"], "replaceNode")
        self.assertEqual(edits[0]["localId"], para.local_id)
        self.assertIn("EDITED", edits[0]["value"])

    def test_table_cell_edit_targets_the_cell_node(self):
        blocks = _blocks(self.projection)
        table = next(b for b in blocks if b.kind == "table")
        anchor = next(b for b in self.anchors["blocks"] if b["localId"] == table.local_id)
        self.assertTrue(anchor["cells"] and len(anchor["cells"]) >= 2)
        target = anchor["cells"][1][0]  # first data row, first column

        lines = table.body.splitlines()
        # line 0 = header, line 1 = delimiter, line 2 = first data row
        cells = lines[2].strip().strip("|").split("|")
        cells[0] = " CHANGED-VALUE "
        lines[2] = "|" + "|".join(cells) + "|"
        table.body = "\n".join(lines)

        new_md = pn.serialize(blocks)
        edits = cp.compile_patch(self.projection, new_md, self.anchors)
        self.assertEqual(len(edits), 1, edits)
        self.assertEqual(edits[0]["name"], "replaceNode")
        self.assertEqual(edits[0]["localId"], target["nodeId"])
        self.assertIn("CHANGED-VALUE", edits[0]["value"])

    def test_opaque_edit_is_refused(self):
        blocks = _blocks(self.projection)
        opaque = next(b for b in blocks if b.kind == "native")
        opaque.body = opaque.body + "<!-- edited -->"
        new_md = pn.serialize(blocks)
        with self.assertRaises(cp.UnsupportedEdit):
            cp.compile_patch(self.projection, new_md, self.anchors)

    def test_unaddressable_nodes_are_handled(self):
        html = (
            "<!-- top-level comment -->"
            '<p>no local id</p>'
            '<p data-local-id="has-id">with id</p>'
        )
        projection, anchors = pn.project(html)
        self.assertNotIn("top-level comment", projection)
        ids = [b["localId"] for b in anchors["blocks"]]
        self.assertEqual(len(ids), 2)
        self.assertTrue(ids[0].startswith("auto-"))
        self.assertEqual(ids[1], "has-id")
        # the unaddressable node is opaque and cannot be patched
        self.assertEqual(anchors["blocks"][0]["kind"], "native")


if __name__ == "__main__":
    unittest.main(verbosity=2)
