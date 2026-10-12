"""Exercise the generated verifier's fail-closed gates without network access."""

import json
import os
import subprocess
from pathlib import Path

import pytest

from harbor_bench.convert.task import TEMPLATES
from harbor_bench.task_shape import render_template


def run_verifier(
    tmp_path: Path,
    check: str | None,
    token: str = "",
    transcript: str | None = None,
    enforce_skill_use: bool = False,
) -> Path:
    workspace = tmp_path / "workspace"
    tests = tmp_path / "tests"
    logs = tmp_path / "logs"
    bin_dir = tmp_path / "bin"
    for directory in (workspace, tests, logs / "verifier", bin_dir):
        directory.mkdir(parents=True, exist_ok=True)
    if transcript is not None:
        (logs / "agent").mkdir()
        (logs / "agent" / "copilot-cli.jsonl").write_text(transcript)
    if check is not None:
        (tests / "check.py").write_text(check)
    (bin_dir / "uv").write_text("#!/bin/sh\nexit 0\n")
    (bin_dir / "uvx").write_text(
        "#!/bin/sh\n"
        f"touch '{tmp_path / 'judge-called'}'\n"
        "while [ \"$#\" -gt 0 ]; do\n"
        "  if [ \"$1\" = --output ]; then\n"
        "    printf '{\"reward\":1.0}' > \"$2\"; exit 0\n"
        "  fi\n"
        "  shift\n"
        "done\nexit 1\n"
    )
    for path in bin_dir.iterdir():
        path.chmod(0o755)
    script = render_template(
        (TEMPLATES / "test.sh").read_text(), SKILL_NAME="test-skill"
    )
    script = (
        script.replace("/workspace", str(workspace))
        .replace("/logs", str(logs))
        .replace("/tests", str(tests))
        .replace("/tmp/sitecustomize.py", str(tmp_path / "sitecustomize.py"))
    )
    env = {
        **os.environ,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "SKILL_EVAL_ENFORCE_SKILL_USE": str(enforce_skill_use).lower(),
        "SKILL_EVAL_SKILL_NAME": "test-skill",
        "OPENAI_API_KEY": token,
        "COPILOT_GITHUB_TOKEN": "",
        "GH_TOKEN": "",
        "GITHUB_TOKEN": "",
    }
    result = subprocess.run(
        ["bash", "-c", script], env=env, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr
    return logs / "verifier"


def skill_events(
    success: bool = True,
    skill: str = "test-skill",
    completion_id: str = "call-1",
) -> list[dict]:
    return [
        {
            "type": "tool.execution_start",
            "data": {
                "toolCallId": "call-1",
                "toolName": "skill",
                "arguments": {"skill": "test-skill"},
            },
        },
        {
            "type": "tool.execution_complete",
            "data": {
                "toolCallId": completion_id,
                "success": success,
                "toolTelemetry": {"restrictedProperties": {"skillName": skill}},
            },
        },
    ]


@pytest.mark.parametrize("reordered", [False, True])
def test_target_skill_completion_reaches_judge(tmp_path, reordered):
    events = skill_events()
    if reordered:
        events[1] = {
            "data": {
                "toolTelemetry": {
                    "restrictedProperties": {"other": "value", "skillName": "test-skill"}
                },
                "success": True,
                "toolCallId": "call-1",
            },
            "type": "tool.execution_complete",
        }
    transcript = "\n".join(json.dumps(event) for event in events)
    verifier = run_verifier(
        tmp_path, None, "fake-test-token", transcript, enforce_skill_use=True
    )
    assert (tmp_path / "judge-called").exists()
    assert json.loads((verifier / "reward.json").read_text()) == {"reward": 1.0}


@pytest.mark.parametrize("events", [
    skill_events(success=False),
    skill_events(skill="different-skill"),
    skill_events(completion_id="different-call"),
    skill_events()[:1],
    skill_events()[1:],
    list(reversed(skill_events())),
])
def test_invalid_skill_completion_short_circuits_judge(tmp_path, events):
    transcript = "\n".join(json.dumps(event) for event in events)
    verifier = run_verifier(
        tmp_path, None, "fake-test-token", transcript, enforce_skill_use=True
    )
    assert (verifier / "reward.txt").read_text().strip() == "0"
    assert (verifier / "reason.txt").read_text().strip() == "skill_use_ok=0"
    assert not (tmp_path / "judge-called").exists()


@pytest.mark.parametrize("transcript", [None, "", "{invalid json"])
def test_missing_or_malformed_transcript_fails_closed(tmp_path, transcript):
    verifier = run_verifier(
        tmp_path, None, "fake-test-token", transcript, enforce_skill_use=True
    )
    assert (verifier / "reward.txt").read_text().strip() == "0"
    assert not (tmp_path / "judge-called").exists()
