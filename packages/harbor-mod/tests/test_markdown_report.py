"""Tests for the Markdown Comparison report renderer.

The renderer's public interface is :func:`render_markdown`; the integration
tests that assert on full report strings live in ``test_compare.py``. The
formatting rules it is built on (``_fmt``/``_delta``) are an internal seam of
this module: they are pinned directly here so the number/delta semantics are
tested in isolation, not through fragile substrings of the whole document.
"""

from __future__ import annotations

from harbor_mod.markdown_report import _delta, _fmt


def test_fmt_none_is_em_dash():
    assert _fmt(None) == "—"


def test_fmt_bool_renders_pass_and_fail():
    assert _fmt(True) == "pass"
    assert _fmt(False) == "FAIL"


def test_fmt_small_float_three_decimals():
    assert _fmt(0.724569) == "0.725"
    assert _fmt(0.05) == "0.050"


def test_fmt_large_float_two_decimals_with_separators():
    assert _fmt(1.665217) == "1.67"
    assert _fmt(300.0) == "300.00"


def test_fmt_int_with_thousands_separator():
    assert _fmt(1000) == "1,000"


def test_delta_both_missing_is_dash():
    assert _delta(None, None) == "—"


def test_delta_one_sided_marks_new_and_only_base():
    assert _delta(None, 5) == "(new) 5"
    assert _delta(5, None) == "(only base) 5"


def test_delta_bool_transition_shows_arrow():
    assert _delta(True, True) == "pass"
    assert _delta(True, False) == "pass → FAIL"


def test_delta_float_sign_and_precision():
    assert _delta(0.8, 0.95) == "+0.150"
    assert _delta(1, 3.5) == "+2.50"


def test_delta_int_sign():
    assert _delta(7, 9) == "+2"
    assert _delta(9, 7) == "-2"


def test_delta_unrelated_strings_are_dash():
    assert _delta("a", "b") == "—"
