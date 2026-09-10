#!/usr/bin/env python3
"""Structural-edit tests for the projection spike (tables and lists).

Run:  python3 -m unittest test_structural_edits -v   (from this directory)

Covers the second slice:
- table row insert/delete -> insertNodeAfter/deleteNode on the <tr>;
- table column insert/delete -> per-row insert/delete on the <td>/<th>;
- list item text change -> replaceNode on the item's node;
- list item insert/delete -> insert/delete on the <li>;
- whole-list insertion -> a rendered <ul> inserted after the previous block.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

import compile_patch as cp
import project_native as pn

FIXTURES = Path(__file__).parent / "fixtures"
SMALL = FIXTURES / "native-3313926515.html"
LISTS = FIXTURES / "native-lists.html"


def _first_table(proj, anchors):
    for block in cp.parse_projection(proj):
        if block.kind != "table":
            continue
        anchor = next(
            (b for b in anchors["blocks"] if b["localId"] == block.local_id), None
        )
        if anchor and anchor.get("cells") and len(anchor["cells"]) >= 2:
            return block, anchor
    raise AssertionError("no table with data rows")


def _map_table(proj, table_id, fn):
    blocks = cp.parse_projection(proj)
    table = next(b for b in blocks if b.local_id == table_id)
    table.body = fn(table.body)
    return pn.serialize(blocks)


def _add_column(body):
    out = []
    for line in body.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        cells.append("--" if all(re.fullmatch(r"-{2,}", c) for c in cells) else "new")
        out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out)


def _drop_last_column(body):
    out = []
    for line in body.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")][:-1]
        out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out)


class TableStructuralTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.native = SMALL.read_text(encoding="utf-8")
        cls.proj, cls.anchors = pn.project(cls.native)

    def test_row_insert(self):
        table, anchor = _first_table(self.proj, self.anchors)
        width = len(table.body.splitlines()[0].strip().strip("|").split("|"))
        new_md = _map_table(
            self.proj, table.local_id,
            lambda b: b + "\n| " + " | ".join(["new"] * width) + " |",
        )
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(len(edits), 1, edits)
        self.assertEqual(edits[0]["name"], "insertNodeAfter")
        self.assertEqual(edits[0]["localId"], anchor["rowIds"][-1])
        self.assertIn("<tr data-local-id=", edits[0]["value"])

    def test_row_delete(self):
        table, anchor = _first_table(self.proj, self.anchors)
        new_md = _map_table(
            self.proj, table.local_id, lambda b: "\n".join(b.splitlines()[:-1])
        )
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(edits, [{"name": "deleteNode", "localId": anchor["rowIds"][-1]}])

    def test_column_insert(self):
        table, anchor = _first_table(self.proj, self.anchors)
        new_md = _map_table(self.proj, table.local_id, _add_column)
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(len(edits), len(anchor["rowIds"]))
        self.assertTrue(all(e["name"] == "insertNodeAfter" for e in edits))
        self.assertEqual(
            [e["localId"] for e in edits],
            [row[-1]["cellId"] for row in anchor["cells"]],
        )
        # header row grows a <th>, data rows a <td>
        self.assertIn("<th data-local-id=", edits[0]["value"])
        self.assertIn("<td data-local-id=", edits[1]["value"])

    def test_column_delete(self):
        table, anchor = _first_table(self.proj, self.anchors)
        new_md = _map_table(self.proj, table.local_id, _drop_last_column)
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(len(edits), len(anchor["rowIds"]))
        self.assertTrue(all(e["name"] == "deleteNode" for e in edits))
        self.assertEqual(
            [e["localId"] for e in edits],
            [row[-1]["cellId"] for row in anchor["cells"]],
        )


class ListStructuralTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.native = LISTS.read_text(encoding="utf-8")
        cls.proj, cls.anchors = pn.project(cls.native)

    def _list(self, tag):
        block = next(
            b for b in cp.parse_projection(self.proj) if b.kind == "list" and b.tag == tag
        )
        anchor = next(b for b in self.anchors["blocks"] if b["localId"] == block.local_id)
        return block, anchor

    def test_lists_are_anchored_not_opaque(self):
        kinds = {b["kind"] for b in self.anchors["blocks"]}
        self.assertIn("list", kinds)
        self.assertEqual(len([b for b in self.anchors["blocks"] if b["kind"] == "list"]), 2)
        ol = next(b for b in self.anchors["blocks"] if b["kind"] == "list" and b["ordered"])
        self.assertTrue(ol["items"])

    def test_item_text_change(self):
        block, anchor = self._list("ul")
        blocks = cp.parse_projection(self.proj)
        for b in blocks:
            if b.local_id == block.local_id:
                b.body = b.body.replace("Draft the plan", "Draft the plan now")
        new_md = pn.serialize(blocks)
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(len(edits), 1, edits)
        self.assertEqual(edits[0]["name"], "replaceNode")
        self.assertEqual(edits[0]["localId"], anchor["items"][0]["nodeId"])
        self.assertIn("Draft the plan now", edits[0]["value"])

    def test_item_insert(self):
        block, anchor = self._list("ul")
        blocks = cp.parse_projection(self.proj)
        for b in blocks:
            if b.local_id == block.local_id:
                b.body = b.body + "\n- Third item"
        new_md = pn.serialize(blocks)
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(len(edits), 1, edits)
        self.assertEqual(edits[0]["name"], "insertNodeAfter")
        self.assertEqual(edits[0]["localId"], anchor["items"][-1]["itemId"])
        self.assertIn("<li data-local-id=", edits[0]["value"])

    def test_item_delete(self):
        block, anchor = self._list("ol")
        blocks = cp.parse_projection(self.proj)
        for b in blocks:
            if b.local_id == block.local_id:
                b.body = "\n".join(b.body.splitlines()[1:])
        new_md = pn.serialize(blocks)
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        self.assertEqual(len(edits), 1, edits)
        self.assertEqual(edits[0]["name"], "deleteNode")
        self.assertEqual(edits[0]["localId"], anchor["items"][0]["itemId"])

    def test_whole_list_insertion(self):
        blocks = cp.parse_projection(self.proj)
        new_list = pn.Block(local_id="new-list", kind="list", body="- a\n- b", tag="ul")
        blocks.insert(1, new_list)
        new_md = pn.serialize(blocks)
        edits = cp.compile_patch(self.proj, new_md, self.anchors)
        inserts = [e for e in edits if e["name"] == "insertNodeAfter"]
        self.assertEqual(len(inserts), 1, edits)
        self.assertIn('<ul data-local-id="new-list">', inserts[0]["value"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
