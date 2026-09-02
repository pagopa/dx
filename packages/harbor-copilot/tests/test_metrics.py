"""Tests for the metric registry self-check that live on the agent side.

The registry is the single declaration of each metric's identity; the reader's
``TrialMetrics`` and the writer's ``CopilotUsage`` re-express its keys as
dataclass fields. ``validate_metric_specs`` is the check that keeps that
one-declaration honest: it is wired as an import-time guard in
``copilot_cli_mod.py`` and in the harbor-bench app's ``jobs.py``. These tests
cover the invariants that need no app type (usage attributes, preferences,
dynamic reward specs); the app-side suite exercises the ``TrialMetrics``
coupling.
"""

from __future__ import annotations

import pytest

from harbor_copilot.copilot_usage import CopilotUsage
from harbor_copilot.metrics import (
    METRIC_SPECS,
    MetricSpec,
    validate_metric_specs,
)


def test_every_usage_attr_names_a_copilot_usage_field():
    fields = set(CopilotUsage.__dataclass_fields__)
    missing = [
        (spec.key, spec.usage_attr)
        for spec in METRIC_SPECS
        if spec.usage_attr is not None and spec.usage_attr not in fields
    ]
    assert missing == []


def test_unknown_usage_attr_raises():
    with pytest.raises(TypeError, match="not a CopilotUsage field"):
        validate_metric_specs(
            copilot_usage_fields=set(CopilotUsage.__dataclass_fields__)
            - {"input_tokens"},
        )


def test_reward_source_specs_skip_the_key_check(monkeypatch):
    import harbor_copilot.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("score.quality", "score", source="reward"),),
    )
    # Would raise if the dynamic score key were validated against either set.
    validate_metric_specs(trial_metric_fields=set(), copilot_usage_fields=set())


def test_metric_registry_declares_comparison_semantics():
    by_key = {spec.key: spec for spec in METRIC_SPECS}

    assert by_key["cost_usd"].preference == "lower"
    assert by_key["cost_usd"].headline_group == "Execution signals"
    assert by_key["cache_tokens"].preference == "neutral"
    assert by_key["verifier_tokens"].preference == "neutral"


def test_unknown_metric_preference_raises(monkeypatch):
    import harbor_copilot.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("input_tokens", preference="sideways"),),
    )
    with pytest.raises(TypeError, match="unsupported preference"):
        validate_metric_specs(
            trial_metric_fields=set(),
        )


def test_copilot_usage_has_measurement_fields():
    """The usage dataclass exposes the exact fields the registry reads."""
    for spec in METRIC_SPECS:
        if spec.usage_attr is None:
            continue
        assert hasattr(CopilotUsage, spec.usage_attr)
