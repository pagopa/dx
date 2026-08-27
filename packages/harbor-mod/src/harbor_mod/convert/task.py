"""Generate one runnable Harbor task directory from an eval case."""

from __future__ import annotations

import json
import re
from pathlib import Path

import tomli_w

from .schema import EvalsFile
from .workspace import compose_workspace

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"

# schema 1.4 task.toml skeleton; skill defaults / overrides are merged in.
DEFAULT_TASK_TOML: dict = {
    "schema_version": "1.4",
    "artifacts": [],
    "verifier": {
        "timeout_sec": 600.0,
        "collect": [],
        # LLM judge bridge: route GitHub Copilot through LiteLLM's `openai`
        # provider (OpenAI-compatible endpoint) so the judge can run headless
        # with COPILOT_GITHUB_TOKEN as the key. gpt-5.x models are
        # Responses-API-only, so LITELLM_ROUTE_ALL_CHAT_OPENAI_TO_RESPONSES
        # sends all openai/* judge calls to https://api.githubcopilot.com/responses.
        "env": {
            "OPENAI_API_BASE": "https://api.githubcopilot.com",
            "OPENAI_API_KEY": "${COPILOT_GITHUB_TOKEN}",
            "LITELLM_DROP_PARAMS": "true",
            "LITELLM_ROUTE_ALL_CHAT_OPENAI_TO_RESPONSES": "true",
        },
    },
    "agent": {"timeout_sec": 900.0},
    "environment": {
        "network_mode": "public",
        "build_timeout_sec": 900.0,
        "os": "linux",
        "mcp_servers": [],
        "env": {},
    },
    "solution": {"env": {}},
}


def _task_name(skill_name: str, case_id: int, case_name: str | None) -> str:
    """Harbor task name: org/name (both segments non-empty, no spaces)."""
    org = "pagopa"
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", (case_name or f"eval-{case_id}").strip()).strip("-")
    return f"{org}/{skill_name}-{slug}"


def _deep_merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def _write_template(src: Path, dst: Path, **replacements: str) -> None:
    text = src.read_text()
    for key, value in replacements.items():
        text = text.replace("{{" + key + "}}", value)
    dst.write_text(text)


def generate_task(
    *,
    evals_file: EvalsFile,
    case_id: int,
    task_root: Path,
    workspace_dir: Path | None = None,
    overlays: list[Path] = (),
    files: list[Path] = (),
    env_overrides: dict | None = None,
) -> list[str]:
    """Write a full Harbor task tree at ``task_root`` for one eval case.

    Returns the list of created fixture paths (workspace files).
    """
    case = next(c for c in evals_file.evals if c.id == case_id)
    harbor = evals_file.harbor

    task_root.mkdir(parents=True, exist_ok=True)
    # skeleton with harbor timeout defaults, THEN user overrides win
    task_toml = _deep_merge(
        DEFAULT_TASK_TOML,
        {
            "agent": {
                "timeout_sec": max(
                    DEFAULT_TASK_TOML["agent"]["timeout_sec"], harbor.timeout_sec
                )
            },
            "verifier": {
                "timeout_sec": max(
                    DEFAULT_TASK_TOML["verifier"]["timeout_sec"], harbor.timeout_sec
                )
            },
        },
    )
    task_toml = _deep_merge(task_toml, env_overrides or {})
    task_toml.setdefault("task", {})
    task_toml["task"]["name"] = _task_name(evals_file.skill_name, case.id, case.name)
    task_toml["task"]["description"] = case.expected_output.strip()[:200]
    task_toml["task"]["version"] = "1.0.0"
    task_toml.setdefault("metadata", {})
    task_toml["metadata"].setdefault("difficulty", "medium")
    task_toml["metadata"].setdefault("category", "skill-eval")
    task_toml["metadata"].setdefault(
        "tags", [evals_file.skill_name, "skill-eval"]
    )
    task_toml["metadata"].setdefault("estimated_duration_sec", 900)

    # Separate verifier env: the verifier runs in a dedicated container that
    # never receives the agent's injected skills. Harbor transfers only the
    # declared artifacts (workspace + agent trajectory jsonl) at their paths.
    verifier_mode = harbor.verifier_mode
    if verifier_mode == "separate":
        task_toml["verifier"]["environment_mode"] = "separate"
        task_toml["artifacts"] = list(harbor.artifacts) or [
            "/workspace",
            "/logs/agent/copilot-cli.jsonl",
        ]
    else:
        task_toml["verifier"].pop("environment_mode", None)
        task_toml["artifacts"] = []

    (task_root / "task.toml").write_text(tomli_w.dumps(task_toml))

    (task_root / "instruction.md").write_text(case.prompt.strip() + "\n")

    # environment/ = fixture workspace + generated Dockerfile
    env_dir = task_root / "environment"
    created = compose_workspace(
        env_dir,
        workspace_dir=workspace_dir,
        overlays=overlays,
        files=files,
    )
    (env_dir / "Dockerfile").write_text(
        (TEMPLATES / "Dockerfile").read_text().format(base_image=harbor.base_image)
    )
    (env_dir / ".dockerignore").write_text(
        (TEMPLATES / "dockerignore").read_text()
    )

    # tests/ = verifier + judge + rubric
    tests_dir = task_root / "tests"
    tests_dir.mkdir(parents=True, exist_ok=True)
    _write_template(
        TEMPLATES / "test.sh",
        tests_dir / "test.sh",
        SKILL_NAME=evals_file.skill_name,
    )
    _write_template(TEMPLATES / "judge.py", tests_dir / "judge.py")
    if verifier_mode == "separate":
        # Separate verifier image: Harbor builds the verifier container from
        # this Dockerfile; tests/ is NOT uploaded at runtime.
        _write_template(
            TEMPLATES / "verifier-Dockerfile",
            tests_dir / "Dockerfile",
        )
    (tests_dir / "rubric.json").write_text(
        json.dumps(
            {
                "prompt": case.prompt,
                "expected_output": case.expected_output,
                "expectations": case.expectations,
                "judge_model": harbor.judge_model,
            },
            indent=2,
        )
    )

    # solution/ = oracle stub
    solution_dir = task_root / "solution"
    solution_dir.mkdir(parents=True, exist_ok=True)
    _write_template(TEMPLATES / "solve.sh", solution_dir / "solve.sh")

    return created
