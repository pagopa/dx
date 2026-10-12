"""Regression coverage for Jira's bundled confirmation digest."""

import copy
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest


SCRIPT = (Path(__file__).resolve().parents[3] /
          "plugins/aiepdf/skills/jira-magister/scripts/projection_digest.py")
spec = importlib.util.spec_from_file_location("projection_digest", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


@pytest.fixture
def manifest():
    return {
        "schema": "jira-projection-review/v1",
        "mode": "backlog",
        "target": {"site": "https://example.org", "project": "SERV"},
        "items": {
            "UC-01::subscribe": {
                "operation": "update", "issue_key": "SERV-1",
                "payload": {"fields": {
                    "summary": "Subscribe", "description": "Complete description",
                    "parent": {"key": "SERV-2"}, "labels": ["delivery"],
                    "customfield_123": 0.5,
                }},
            },
        },
        "relationships": [{"from": "SERV-1", "to": "SERV-3", "type": "blocks"}],
        "remote_links": [{"owner": "SERV-1", "url": "https://example.org/uc/1"}],
        "sources": {
            "UC-01": {"url": "https://example.org/uc/1", "revision": 1,
                      "content_sha256": hashlib.sha256(b"canonical source").hexdigest()},
        },
        "review": {"coverage": "PASS", "gaps": []},
    }


def test_digest_has_defined_serialization_and_key_order(manifest):
    expected = "sha256:" + hashlib.sha256(json.dumps(
        manifest, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")).hexdigest()
    reordered = json.loads(json.dumps(manifest, sort_keys=True))
    assert module.projection_digest(manifest) == expected
    assert module.projection_digest(reordered) == expected


@pytest.mark.parametrize("path,value", [
    (("target", "project"), "OTHER"),
    (("mode",), "single-item"),
    (("items", "UC-01::subscribe", "operation"), "create"),
    (("items", "UC-01::subscribe", "issue_key"), "SERV-9"),
    (("items", "UC-01::subscribe", "payload", "fields", "summary"), "Changed"),
    (("items", "UC-01::subscribe", "payload", "fields", "description"), "Changed"),
    (("items", "UC-01::subscribe", "payload", "fields", "parent"), {"key": "SERV-9"}),
    (("items", "UC-01::subscribe", "payload", "fields", "customfield_123"), None),
    (("relationships", 0, "from"), "SERV-3"),
    (("remote_links", 0, "url"), "https://example.org/changed"),
    (("sources", "UC-01", "content_sha256"), hashlib.sha256(b"changed source").hexdigest()),
    (("sources", "UC-01", "revision"), 2),
    (("review", "coverage"), "FAIL"),
])
def test_mutable_projection_and_source_changes_invalidate_digest(manifest, path, value):
    updated = copy.deepcopy(manifest)
    node = updated
    for part in path[:-1]:
        node = node[part]
    node[path[-1]] = value
    assert module.projection_digest(updated) != module.projection_digest(manifest)


@pytest.mark.parametrize("field", [
    "schema", "mode", "target", "items", "sources", "relationships",
    "remote_links", "review",
])
def test_incomplete_manifest_is_rejected(manifest, field):
    del manifest[field]
    with pytest.raises(ValueError):
        module.projection_digest(manifest)


def test_cli_prints_only_digest(manifest, tmp_path):
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(manifest))
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(path)], capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == module.projection_digest(manifest)
    assert "Complete description" not in result.stdout


@pytest.mark.parametrize("content", ['{"schema":1,"schema":2}', '{"private":broken}'])
def test_cli_rejects_invalid_json_without_echoing_input(tmp_path, content):
    path = tmp_path / "manifest.json"
    path.write_text(content)
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(path)], capture_output=True, text=True
    )
    assert result.returncode == 1
    assert not result.stdout
    assert "private" not in result.stderr


def test_non_finite_numbers_are_rejected(manifest):
    manifest["review"]["estimate"] = float("nan")
    with pytest.raises(ValueError):
        module.projection_digest(manifest)
