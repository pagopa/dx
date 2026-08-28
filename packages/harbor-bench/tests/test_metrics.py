"""Tests for the metric registry's self-check (metrics.py).

The registry is the single declaration of each metric's identity; the reader's
``TrialMetrics`` and the writer's ``CopilotUsage`` re-express its keys as
dataclass fields. ``validate_metric_specs`` is the check that keeps that
one-declaration honest: it is wired as an import-time guard in ``jobs.py`` and
``copilot_cli_mod.py``, and exercised directly here.
"""

from __future__ import annotations

import pytest

from harbor_bench.copilot_usage import CopilotUsage
from harbor_bench.jobs import TrialMetrics
from harbor_bench.metrics import (
    METRIC_SPECS,
    MetricSpec,
    validate_metric_specs,
)


def test_every_registry_key_names_a_trial_metrics_field():
    fields = set(TrialMetrics.__dataclass_fields__)
    missing = [
        spec.key
        for spec in METRIC_SPECS
        if spec.source != "reward" and spec.key not in fields
    ]
    assert missing == []


def test_every_usage_attr_names_a_copilot_usage_field():
    fields = set(CopilotUsage.__dataclass_fields__)
    missing = [
        (spec.key, spec.usage_attr)
        for spec in METRIC_SPECS
        if spec.usage_attr is not None and spec.usage_attr not in fields
    ]
    assert missing == []


def test_registry_passes_its_own_check():
    validate_metric_specs(
        trial_metric_fields=set(TrialMetrics.__dataclass_fields__),
        copilot_usage_fields=set(CopilotUsage.__dataclass_fields__),
    )


def test_unknown_trial_metrics_field_raises():
    with pytest.raises(TypeError, match="no TrialMetrics field"):
        validate_metric_specs(
            trial_metric_fields=set(TrialMetrics.__dataclass_fields__)
            - {"input_tokens"},
            copilot_usage_fields=set(CopilotUsage.__dataclass_fields__),
        )


def test_unknown_usage_attr_raises():
    with pytest.raises(TypeError, match="not a CopilotUsage field"):
        validate_metric_specs(
            trial_metric_fields=set(TrialMetrics.__dataclass_fields__),
            copilot_usage_fields=set(CopilotUsage.__dataclass_fields__)
            - {"input_tokens"},
        )


def test_reward_source_specs_skip_the_key_check(monkeypatch):
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("score.quality", "score", source="reward"),),
    )
    # Would raise if the dynamic score key were validated against either set.
    validate_metric_specs(trial_metric_fields=set(), copilot_usage_fields=set())
