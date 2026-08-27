"""Generate one runnable Harbor task directory from an eval case."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

import tomli_w

from .schema import EvalCase, EvalsFile
from .workspace import WorkspaceError, compose_workspace

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


def _write_with_override(
    *,
    target: str,
    dst: Path,
    overrides: dict[str, Path] | None,
    default: str,
    **placeholders: str,
) -> None:
    """Write ``dst``: the user override for ``target`` when present, otherwise
    the generated ``default``.

    ``{{KEY}}`` placeholders are substituted in both the override content and
    the default, so a custom file can still reference per-case values.
    """
    text = (
        overrides[target].read_text()
        if overrides and target in overrides
        else default
    )
    for key, value in placeholders.items():
        text = text.replace("{{" + key + "}}", value)
    dst.write_text(text)


def build_quality_toml(case: EvalCase, judge_model: str) -> str:
    """Render ``tests/quality.toml``: RewardKit judge header + per-eval criteria.

    The header (``quality-header.toml``) pins the judge model, the evidence
    files (workspace packet + ATIF trajectory), and the scoring gate. The
    criteria translate the agentskills.io rubric (``expected_output`` +
    ``expectations``) into binary RewardKit criteria, one per assertion.
    """
    header = (
        TEMPLATES / "quality-header.toml"
    ).read_text().replace("{{JUDGE_MODEL}}", judge_model)

    criteria: list[dict] = [
        {
            "description": (
                "The agent's output satisfies the expected result: "
                f"{case.expected_output.strip()}"
            ),
            "type": "binary",
        }
    ]
    criteria += [
        {"description": expectation.strip(), "type": "binary"}
        for expectation in case.expectations
        if expectation.strip()
    ]
    return header + "\n" + tomli_w.dumps({"criterion": criteria})


def generate_task(
    *,
    evals_file: EvalsFile,
    case_id: int,
    task_root: Path,
    workspace_dir: Path | None = None,
    overlays: list[Path] = (),
    files: list[Path] = (),
    prepare_script: Path | None = None,
    env_overrides: dict | None = None,
    overrides: dict[str, Path] | None = None,
) -> list[str]:
    """Write a full Harbor task tree at ``task_root`` for one eval case.

    ``overrides`` maps a destination path (relative to the task root, see
    ``OVERRIDABLE_TARGETS``) to an absolute source file in the skill dir. An
    overridden destination replaces the generated file verbatim (with
    ``{{KEY}}`` placeholder substitution); ``task.toml`` is replaced wholesale.

    ``prepare_script`` (when set) is a build-time setup script from the skill
    dir: it is copied into the workspace as ``prepare.sh`` and the generated
    ``environment/Dockerfile`` runs it after ``COPY . /workspace/``, before the
    git baseline. Per-eval ``prepare_script`` wins over the suite-level one (see
    ``resolve_eval_paths``).

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
    # declared artifacts (workspace + agent trajectory) at their paths.
    verifier_mode = harbor.verifier_mode
    if verifier_mode == "separate":
        task_toml["verifier"]["environment_mode"] = "separate"
        task_toml["artifacts"] = list(harbor.artifacts) or [
            "/workspace",
            "/logs/agent/copilot-cli.jsonl",
            # ATIF trajectory (written by the copilot-cli agent after the run);
            # RewardKit [judge].atif-trajectory points here for process criteria.
            "/logs/agent/trajectory.json",
        ]
    else:
        task_toml["verifier"].pop("environment_mode", None)
        task_toml["artifacts"] = []

    if overrides and "task.toml" in overrides:
        # Full replace: the user's task.toml wins wholesale; per-case values
        # are available as {{TASK_NAME}}/{{TASK_DESCRIPTION}}/{{TASK_VERSION}}.
        _write_with_override(
            target="task.toml",
            dst=task_root / "task.toml",
            overrides=overrides,
            default=tomli_w.dumps(task_toml),
            TASK_NAME=task_toml["task"]["name"],
            TASK_DESCRIPTION=task_toml["task"]["description"],
            TASK_VERSION=task_toml["task"]["version"],
        )
    else:
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
    if prepare_script is not None:
        # Build-time setup hook: the generated Dockerfile runs /workspace/prepare.sh
        # after copying the workspace and before the git baseline commit.
        prepare_dst = env_dir / "prepare.sh"
        if prepare_dst.exists():
            raise WorkspaceError(
                f"prepare_script would overwrite workspace file 'prepare.sh' "
                f"(configured {prepare_script} collides with a fixture layer)"
            )
        shutil.copy2(prepare_script, prepare_dst)
        created.append("prepare.sh")
    _write_with_override(
        target="environment/Dockerfile",
        dst=env_dir / "Dockerfile",
        overrides=overrides,
        default=(TEMPLATES / "Dockerfile")
        .read_text()
        .format(base_image=harbor.base_image),
    )
    _write_with_override(
        target=".dockerignore",
        dst=env_dir / ".dockerignore",
        overrides=overrides,
        default=(TEMPLATES / "dockerignore").read_text(),
    )

    # tests/ = verifier + RewardKit judge config
    tests_dir = task_root / "tests"
    tests_dir.mkdir(parents=True, exist_ok=True)
    _write_with_override(
        target="tests/test.sh",
        dst=tests_dir / "test.sh",
        overrides=overrides,
        default=(TEMPLATES / "test.sh").read_text(),
        SKILL_NAME=evals_file.skill_name,
    )
    # RewardKit quality.toml: header ([judge]/[scoring]) + per-eval criteria.
    _write_with_override(
        target="tests/quality.toml",
        dst=tests_dir / "quality.toml",
        overrides=overrides,
        default=build_quality_toml(case, harbor.judge_model),
        JUDGE_MODEL=harbor.judge_model,
    )
    if verifier_mode == "separate":
        # Separate verifier image: Harbor builds the verifier container from
        # this Dockerfile; tests/ is NOT uploaded at runtime.
        _write_with_override(
            target="tests/Dockerfile",
            dst=tests_dir / "Dockerfile",
            overrides=overrides,
            default=(TEMPLATES / "verifier-Dockerfile").read_text(),
        )

    # solution/ = oracle stub
    solution_dir = task_root / "solution"
    solution_dir.mkdir(parents=True, exist_ok=True)
    _write_with_override(
        target="solution/solve.sh",
        dst=solution_dir / "solve.sh",
        overrides=overrides,
        default=(TEMPLATES / "solve.sh").read_text(),
    )

    return created
