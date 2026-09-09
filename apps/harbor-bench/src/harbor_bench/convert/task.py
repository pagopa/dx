"""Generate one runnable Harbor task directory from an eval case."""

from __future__ import annotations

import os
import re
import shutil
import tomllib
from copy import deepcopy
from dataclasses import dataclass, field
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

#: The exact set of files ``convert`` generates for every task (identical for
#: every task of every skill). These are the ONLY files a skill's ``harbor/``
#: overlay may replace — see ``harbor_bench.convert.overlay``.
GENERATED_TASK_FILES: frozenset[str] = frozenset(
    {
        "task.toml",
        "instruction.md",
        "environment/Dockerfile",
        "environment/.dockerignore",
        "tests/test.sh",
        "tests/quality.toml",
        "tests/Dockerfile",
        "solution/solve.sh",
    }
)

#: Names the converter writes into the fixture workspace dir
#: (``environment/``) after the fixture layers are staged. A fixture that
#: collides with one of these names is rejected rather than silently
#: overwritten — customize via the ``harbor/`` overlay instead.
RESERVED_ENVIRONMENT_FILES: tuple[str, ...] = ("Dockerfile", ".dockerignore")

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
    ``overlay`` maps task-relative paths to skill-side ``harbor/`` sources
    (suite and per-task already merged by the plan; per-task wins). An overlay
    file either replaces a generated file (its path matches
    ``GENERATED_TASK_FILES``) or is added to the task tree (e.g. an extra
    file under ``environment/``). ``run_level_overrides`` carries
    converter-owned run-level patches (e.g. ``--without-skill``) re-applied
    over the final ``task.toml``.
    The write destination (``task_root``) is deliberately NOT part of the spec:
    the spec is the *what*, ``task_root`` is the *where*.
    """

    task_dir: str
    skill_name: str
    case: EvalCase
    paths: ResolvedEvalPaths
    overlay: dict[str, Path] = field(default_factory=dict)
    run_level_overrides: dict | None = None


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


def deep_merge(base: dict, override: dict) -> dict:
    """Deep-merge ``override`` onto a copy of ``base`` (later wins)."""
    out = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
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


def _apply_overlay(task_root: Path, overlay: dict[str, Path]) -> None:
    """Apply the skill's ``harbor/`` overlay onto a generated task tree.

    Each overlay file lands at its task-relative path: if the path matches a
    generated file (``GENERATED_TASK_FILES``) it **replaces** it wholesale;
    otherwise the file is **added** (directories created as needed). An overlay
    never silently overwrites a per-eval fixture staged from ``evals.json``:
    only generated files may be replaced, so a collision with a case's ``files``
    is an error.
    """
    for rel, source in sorted(overlay.items()):
        target = task_root / rel
        if target.exists() and rel not in GENERATED_TASK_FILES:
            raise WorkspaceError(
                f"overlay file {rel!r} would overwrite a per-eval fixture "
                "staged from the eval case 'files' (only generated files may be "
                "replaced); remove it from the case files or drop the overlay"
            )
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def _apply_run_level(task_toml_path: Path, overrides: dict | None) -> None:
    """Re-apply converter-owned run-level ``task.toml`` patches (later wins).

    Run-level flags (``--without-skill``) stay authoritative even when the
    author replaced ``task.toml`` through the ``harbor/`` overlay: the patch is
    deep-merged over the final file, so a run can always gate skill use.
    """
    if not overrides:
        return
    data = tomllib.loads(task_toml_path.read_text(encoding="utf-8"))
    task_toml_path.write_text(tomli_w.dumps(deep_merge(data, overrides)))


def generate_task(spec: TaskSpec, task_root: Path) -> list[str]:
    """Write a full Harbor task tree at ``task_root`` from a :class:`TaskSpec`.

    The generated task is fully owned by the converter: the fixed files from
    ``GENERATED_TASK_FILES`` (rendered from templates + the eval case), plus
    the eval case's ``files`` staged into ``environment/``. After generation the
    skill's ``harbor/`` overlay (``spec.overlay``) replaces matching generated
    files wholesale and adds any other file (e.g. extra context under
    ``environment/``), then run-level overrides are re-applied over the final
    ``task.toml``.

    Returns the list of created fixture paths (the eval case's ``files``).
    """
    case = spec.case

    task_root.mkdir(parents=True, exist_ok=True)

    task_toml = deep_merge(DEFAULT_TASK_TOML, {})
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

    # environment/ = per-eval fixtures + generated Dockerfile
    env_dir = task_root / "environment"
    created = compose_workspace(
        env_dir,
        files=spec.paths["files"],
        reserved=RESERVED_ENVIRONMENT_FILES,
    )
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

    # skill-owned overlay replaces generated files, then run-level wins
    _apply_overlay(task_root, spec.overlay)
    _apply_run_level(task_root / "task.toml", spec.run_level_overrides)

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
