"""Tests for the metric registry's self-check against its dataclasses.

The registry (``harbor_bench.metrics``) is the single declaration of each
metric's identity; the reader's ``TrialMetrics`` (in ``jobs.py``) and
``CopilotUsage`` (in ``copilot_usage.py``) re-express its keys as dataclass
fields. ``validate_metric_specs`` is the check that keeps that one declaration
honest: it is wired as an import-time guard in ``jobs.py``. These tests cover
both the ``TrialMetrics`` coupling and the invariants that need no app type
(usage attributes, preferences, dynamic reward specs).
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


def test_registry_passes_its_own_check():
    validate_metric_specs(
        trial_metric_fields=set(TrialMetrics.__dataclass_fields__),
    )


def test_unknown_trial_metrics_field_raises():
    with pytest.raises(TypeError, match="no TrialMetrics field"):
        validate_metric_specs(
            trial_metric_fields=set(TrialMetrics.__dataclass_fields__)
            - {"input_tokens"},
        )


def test_every_usage_attr_names_a_copilot_usage_field():
    fields = set(CopilotUsage.__dataclass_fields__)
    missing = [
        (spec.key, spec.usage_attr)
        for spec in METRIC_SPECS
        if spec.usage_attr is not None and spec.usage_attr not in fields
    ]
    assert missing == []


def test_reward_source_specs_skip_the_key_check(monkeypatch):
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("score.quality", "score", source="reward"),),
    )
    # Would raise if the dynamic score key were validated against TrialMetrics.
    validate_metric_specs(trial_metric_fields=set())


def test_metric_registry_declares_comparison_semantics():
    by_key = {spec.key: spec for spec in METRIC_SPECS}

    assert by_key["cost_usd"].preference == "lower"
    assert by_key["cost_usd"].headline_group == "Execution signals"
    assert by_key["cache_tokens"].preference == "neutral"
    assert by_key["verifier_tokens"].preference == "neutral"


def test_unknown_metric_preference_raises(monkeypatch):
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("input_tokens", preference="sideways"),),
    )
    with pytest.raises(TypeError, match="unsupported preference"):
        validate_metric_specs(trial_metric_fields=set())


def test_ambiguous_derivation_path_raises(monkeypatch):
    """A spec names one persisted location, never two."""
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (
            MetricSpec(
                "input_tokens",
                result_key="n_input_tokens",
                metadata_path=("metadata", "copilot_usage", "reasoning_tokens"),
            ),
        ),
    )
    with pytest.raises(TypeError, match="both result_key and metadata_path"):
        validate_metric_specs(trial_metric_fields={"input_tokens"})


def test_empty_metadata_path_raises(monkeypatch):
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("input_tokens", metadata_path=()),),
    )
    with pytest.raises(TypeError, match="metadata_path must be a non-empty"):
        validate_metric_specs(trial_metric_fields={"input_tokens"})


def test_copilot_usage_has_measurement_fields():
    """The usage dataclass exposes the exact fields the registry reads."""
    for spec in METRIC_SPECS:
        if spec.usage_attr is None:
            continue
        assert hasattr(CopilotUsage, spec.usage_attr)


def test_empty_legacy_metadata_key_raises(monkeypatch):
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (
            MetricSpec(
                "n_requests",
                usage_attr="n_requests",
                legacy_metadata_key="",
            ),
        ),
    )
    with pytest.raises(TypeError, match="legacy_metadata_key must be a non-empty"):
        validate_metric_specs(trial_metric_fields={"n_requests"})


def test_legacy_metadata_key_requires_a_derivation(monkeypatch):
    """An alias the reader never consults is a declaration bug."""
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (MetricSpec("n_steps", legacy_metadata_key="n_steps"),),
    )
    with pytest.raises(TypeError, match="no usage_attr"):
        validate_metric_specs(trial_metric_fields={"n_steps"})


def test_legacy_metadata_key_repeating_metadata_path_raises(monkeypatch):
    """The alias names the fallback, so it must not be the preferred location."""
    import harbor_bench.metrics as metrics_mod

    monkeypatch.setattr(
        metrics_mod,
        "METRIC_SPECS",
        (
            MetricSpec(
                "n_requests",
                metadata_path=("metadata", "n_requests"),
                legacy_metadata_key="n_requests",
                usage_attr="n_requests",
            ),
        ),
    )
    with pytest.raises(TypeError, match="repeats its metadata_path"):
        validate_metric_specs(trial_metric_fields={"n_requests"})
