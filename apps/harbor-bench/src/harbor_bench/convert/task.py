"""Generate one runnable Harbor task directory from an eval case."""

from __future__ import annotations

import os
import re
import shutil
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

import tomli_w

from .schema import EvalCase, ResolvedEvalPaths
from .workspace import WorkspaceError, compose_workspace
from harbor_bench.task_shape import HARBOR_ARTIFACTS, JUDGE_BRIDGE_ENV, render_template

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"

#: Template for the task's environment Dockerfile. Named ``environment.*`` so
#: the workspace Docker plugins do not infer it as a project root; it renders
#: the ``environment/Dockerfile`` inside every generated task.
ENVIRONMENT_DOCKERFILE_TEMPLATE = "environment.Dockerfile.tmpl"

# Defaults formerly configurable through evals.json Harbor metadata.
DEFAULT_BASE_IMAGE = "ubuntu:24.04"
DEFAULT_JUDGE_MODEL = "openai/gpt-5.6-luna"

# schema 1.4 task.toml skeleton; converter defaults are merged in.
DEFAULT_TASK_TOML: dict = {
    "schema_version": "1.4",
    "artifacts": [],
    "verifier": {
        "timeout_sec": 600.0,
        "collect": [],
        # LLM judge bridge (see task_shape.JUDGE_BRIDGE_ENV): route GitHub
        # Copilot through LiteLLM's `openai` provider so the judge can run
        # headless with COPILOT_GITHUB_TOKEN as the key.
        "env": dict(JUDGE_BRIDGE_ENV),
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


@dataclass(frozen=True)
class TaskSpec:
    """The fully-resolved description of one Harbor task to generate.

    Value-based: carries the resolved eval case, the precomputed directory
    name, and the resolved fixture paths — everything generation needs, with no
    lookups and no reference back into an evals file.
    The write destination (``task_root``) is deliberately NOT part of the spec:
    the spec is the *what*, ``task_root`` is the *where*.
    """

    task_dir: str
    skill_name: str
    case: EvalCase
    paths: ResolvedEvalPaths
    workspace_dir: Path | None = None
    env_overrides: dict | None = None


def task_dir_name(skill_name: str, case_id: int, case_name: str | None) -> str:
    """Stable, collision-free task directory name.

    ``<skill>-<case_id>`` for nameless cases, ``<skill>-<case_id>-<slug>`` when
    a human-readable name is declared. The eval ID always participates, so two
    cases that share a name (or an unnamed case and a named one) still map to
    distinct directories.
    """
    slug = re.sub(
        r"[^a-zA-Z0-9._-]+", "-", (case_name or "").strip()
    ).strip("-")
    return f"{skill_name}-{case_id}-{slug}" if slug else f"{skill_name}-{case_id}"


def task_name(task_dir: str) -> str:
    """Harbor task name: ``org/<task_dir>`` (both segments non-empty)."""
    return f"pagopa/{task_dir}"


def _deep_merge(base: dict, override: dict) -> dict:
    out = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def build_quality_toml(case: EvalCase, judge_model: str) -> str:
    """Render ``tests/quality.toml``: RewardKit judge header + per-eval criteria.

    The header (``quality-header.toml``) pins the judge model, the evidence
    files (workspace packet + ATIF trajectory), and the scoring gate. The
    criteria translate the agentskills.io rubric (``expected_output`` +
    ``expectations``) into binary RewardKit criteria, one per assertion.
    """
    header = render_template(
        (TEMPLATES / "quality-header.toml").read_text(),
        JUDGE_MODEL=judge_model,
    )

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


def generate_task(spec: TaskSpec, task_root: Path) -> list[str]:
    """Write a full Harbor task tree at ``task_root`` from a :class:`TaskSpec`.

    ``spec.paths["prepare_script"]`` (when set) is a build-time setup script
    from the skill's on-disk ``harbor/`` layout. It is copied into the
    workspace as ``prepare.sh`` and the generated ``environment/Dockerfile``
    runs it after ``COPY . /workspace/``, before the git baseline.

    Returns the list of created fixture paths (workspace files).
    """
    case = spec.case
    env_overrides = spec.env_overrides

    task_root.mkdir(parents=True, exist_ok=True)
    task_toml = _deep_merge(DEFAULT_TASK_TOML, env_overrides or {})
    task_toml.setdefault("task", {})
    task_toml["task"]["name"] = task_name(spec.task_dir)
    task_toml["task"]["description"] = case.expected_output.strip()[:200]
    task_toml["task"]["version"] = "1.0.0"
    task_toml.setdefault("metadata", {})
    task_toml["metadata"].setdefault("difficulty", "medium")
    task_toml["metadata"].setdefault("category", "skill-eval")
    task_toml["metadata"].setdefault(
        "tags", [spec.skill_name, "skill-eval"]
    )
    task_toml["metadata"].setdefault("estimated_duration_sec", 900)

    # The verifier always runs separately and receives the artifacts consumed
    # by the report readers.
    task_toml["verifier"]["environment_mode"] = "separate"
    task_toml["artifacts"] = list(HARBOR_ARTIFACTS)

    (task_root / "task.toml").write_text(tomli_w.dumps(task_toml))

    (task_root / "instruction.md").write_text(case.prompt.strip() + "\n")

    # environment/ = fixture workspace + generated Dockerfile
    env_dir = task_root / "environment"
    created = compose_workspace(
        env_dir,
        workspace_dir=spec.workspace_dir,
        files=spec.paths["files"],
    )
    prepare_script = spec.paths["prepare_script"]
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
    (env_dir / "Dockerfile").write_text(
        render_template(
            (TEMPLATES / ENVIRONMENT_DOCKERFILE_TEMPLATE).read_text(),
            BASE_IMAGE=DEFAULT_BASE_IMAGE,
        )
    )
    (env_dir / ".dockerignore").write_text(
        render_template((TEMPLATES / "dockerignore").read_text())
    )

    # tests/ = verifier + RewardKit judge config
    tests_dir = task_root / "tests"
    tests_dir.mkdir(parents=True, exist_ok=True)
    (tests_dir / "test.sh").write_text(
        render_template(
            (TEMPLATES / "test.sh").read_text(),
            SKILL_NAME=spec.skill_name,
        )
    )
    # RewardKit quality.toml: header ([judge]/[scoring]) + per-eval criteria.
    (tests_dir / "quality.toml").write_text(
        build_quality_toml(case, DEFAULT_JUDGE_MODEL)
    )
    # Separate verifier image: Harbor builds the verifier container from this
    # Dockerfile; tests/ is NOT uploaded at runtime.
    (tests_dir / "Dockerfile").write_text(
        render_template((TEMPLATES / "verifier-Dockerfile").read_text())
    )

    # solution/ = oracle stub
    solution_dir = task_root / "solution"
    solution_dir.mkdir(parents=True, exist_ok=True)
    (solution_dir / "solve.sh").write_text(
        render_template((TEMPLATES / "solve.sh").read_text())
    )

    return created


def generate_task_atomic(spec: TaskSpec, task_root: Path) -> list[str]:
    """Generate a task atomically: build in a sibling temp dir, swap in on success.

    On failure the previous complete task at ``task_root`` is left untouched and
    the temp dir is removed. On success the swap is a same-directory rename
    (``task_root`` moves to a backup, the fresh temp dir moves into place, the
    backup is dropped), so ``task_root`` never holds a partially-written tree.

    Same interface as :func:`generate_task`.
    """
    parent = task_root.parent
    parent.mkdir(parents=True, exist_ok=True)
    tmp = parent / f".{task_root.name}.tmp-{os.getpid()}"
    backup = parent / f".{task_root.name}.bak-{os.getpid()}"
    for stale in (tmp, backup):
        if stale.exists():
            shutil.rmtree(stale)
    try:
        created = generate_task(spec, tmp)
    except BaseException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    if task_root.exists():
        task_root.rename(backup)
    try:
        tmp.rename(task_root)
    except BaseException:
        if backup.exists() and not task_root.exists():
            backup.rename(task_root)
        raise
    shutil.rmtree(backup, ignore_errors=True)
    return created
