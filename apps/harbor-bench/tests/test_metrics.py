"""Reader-side tests of the metric registry against ``TrialMetrics``.

The registry (``harbor_copilot.metrics``) is the single declaration of each
metric's identity; the reader's ``TrialMetrics`` (in ``jobs.py``) re-expresses
its keys as dataclass fields. ``validate_metric_specs`` is the import-time
guard wired into ``jobs.py``; these tests exercise the coupling between the
registry and the app-side reader type. Registry invariants that do not need
``TrialMetrics`` live in the harbor-copilot test suite.
"""

from __future__ import annotations

import pytest

from harbor_bench.jobs import TrialMetrics
from harbor_copilot.metrics import (
    METRIC_SPECS,
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
