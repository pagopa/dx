"""Plan and apply a Harbor benchmark run: evals.json -> tasks + config.yaml.

Deep module behind ``harbor-mod convert``. It owns the whole workflow behind
two small interfaces:

``plan_run(options) -> RunPlan``
    Normalizes options, discovers and loads every evals.json, validates the
    entire input set (task-name collisions, conflicting agent kwargs, fixture
    existence), and resolves each eval case's fixtures once. A plan never
    writes: plan-time failures leave the output directory untouched.

``apply_run(plan) -> RunResult``
    Executes a plan: generates each task atomically, removes stale task
    directories, and writes ``config.yaml``. Apply-time failures raise and
    leave completed work in place (per-task atomicity via
    :func:`generate_task_atomic`).

The CLI is a thin adapter over this seam: it parses args into
:class:`ConvertOptions`, runs the host preflight, then prints from the
returned plan/result and maps exceptions to exit codes.
"""

from __future__ import annotations

import platform
import shutil
from dataclasses import dataclass, replace
from pathlib import Path

from .config import (
    DEFAULT_ENVIRONMENT_TYPE,
    DEFAULT_MODEL,
    SUPPORTED_ENVIRONMENT_TYPES,
    build_config,
    collect_declared_kwargs,
    write_config,
)
from .discover import DiscoverError, find_evals_files, load_evals_file
from .schema import EvalsFile, resolve_eval_paths
from .task import TaskSpec, generate_task_atomic, task_dir_name

DEFAULT_OUT = Path(".harbor")
DEFAULT_SCAN_ROOT = Path("plugins")


class RunError(ValueError):
    """A workflow-level error in the Run-builder (plan or apply)."""


class TaskNameCollision(RunError):
    """Two eval cases resolve to the same generated task name."""


@dataclass(frozen=True)
class ConvertOptions:
    """Inputs and knobs for planning and executing a Harbor benchmark run.

    Defaults mirror the ``harbor-mod convert`` CLI defaults. ``evals`` holds
    explicit evals.json paths; when empty the plan scans ``scan_root``.
    """

    out: Path = DEFAULT_OUT
    config_out: Path | None = None
    evals: tuple[Path, ...] = ()
    scan_root: Path = DEFAULT_SCAN_ROOT
    without_skill: bool = False
    model: str | None = DEFAULT_MODEL
    environment: str = DEFAULT_ENVIRONMENT_TYPE
    agent_kwargs: dict | None = None
    jobs_dir: Path | None = None
    n_concurrent: int = 4


@dataclass(frozen=True)
class RunPlan:
    """A validated, collision-free plan for one Harbor benchmark run."""

    options: ConvertOptions
    tasks: tuple[TaskSpec, ...]
    skill_dirs: tuple[Path, ...]
    declared_kwargs: dict
    config_out: Path
    sources: tuple[tuple[str, Path, Path], ...]  # (skill_name, evals_path, skill_dir)


@dataclass(frozen=True)
class TaskWrite:
    """One generated task and the fixture paths it staged."""

    task_dir: str
    fixtures: tuple[str, ...]


@dataclass(frozen=True)
class RunResult:
    """What :func:`apply_run` wrote."""

    created_tasks: tuple[TaskWrite, ...]
    stale_removed: tuple[str, ...]
    config_written: Path


def check_host_environment(environment: str) -> str | None:
    """Return an error message when the requested environment cannot run here.

    Only ``apple-container`` has host requirements: an Apple-silicon Mac and
    Apple's ``container`` CLI (installed from
    https://github.com/apple/container/releases, then ``container system start``).
    ``docker`` requires no check: Harbor's own preflight validates the Docker
    daemon at run time. Returns ``None`` when the host is ready.
    """
    if environment != "apple-container":
        return None
    if platform.machine() != "arm64":
        return (
            "Apple Container requires a Mac with Apple silicon (arm64); "
            f"this host is {platform.machine()}. Use --environment docker instead."
        )
    if shutil.which("container") is None:
        return (
            "Apple Container requires Apple's 'container' CLI to be installed. "
            "Download it from https://github.com/apple/container/releases and "
            "run: container system start && container system kernel set --recommended"
        )
    return None


def _normalize_options(options: ConvertOptions) -> ConvertOptions:
    return replace(
        options,
        out=options.out.resolve(),
        config_out=options.config_out.resolve() if options.config_out else None,
        evals=tuple(p.resolve() for p in options.evals),
        scan_root=options.scan_root.resolve(),
        jobs_dir=options.jobs_dir.resolve() if options.jobs_dir else None,
    )


def plan_run(options: ConvertOptions) -> RunPlan:
    """Discover, load, validate, and resolve a full run. Never writes.

    Raises ``DiscoverError``, ``TaskNameCollision``, or ``ValueError`` (a
    conflicting agent kwarg, an unsafe/missing fixture, an unsupported
    environment) when the input set is not runnable; nothing is written.
    """
    opts = _normalize_options(options)
    if opts.environment not in SUPPORTED_ENVIRONMENT_TYPES:
        raise ValueError(
            f"unsupported environment type {opts.environment!r}; expected one of "
            + ", ".join(repr(t) for t in SUPPORTED_ENVIRONMENT_TYPES)
        )
    config_out = opts.config_out or (opts.out / "config.yaml")

    if opts.evals:
        evals_paths = list(opts.evals)
    else:
        evals_paths = find_evals_files(opts.scan_root)
    if not evals_paths:
        raise DiscoverError(
            f"no evals.json found under {opts.scan_root} (pass --evals explicitly)"
        )

    loaded: list[tuple[Path, EvalsFile, Path]] = []
    for evals_path in evals_paths:
        evals, skill_dir = load_evals_file(evals_path)
        loaded.append((evals_path, evals, skill_dir))

    declared_kwargs = collect_declared_kwargs(
        [(evals.skill_name, evals.harbor.kwargs) for _, evals, _ in loaded]
    )

    env_overrides = (
        {"verifier": {"env": {"SKILL_EVAL_ENFORCE_SKILL_USE": "false"}}}
        if opts.without_skill
        else None
    )

    tasks: list[TaskSpec] = []
    seen: dict[str, str] = {}
    for evals_path, evals, skill_dir in loaded:
        resolved = resolve_eval_paths(evals, skill_dir)
        workspace_dir = None
        if evals.harbor.workspace_dir:
            workspace_dir = (skill_dir / evals.harbor.workspace_dir).resolve()
        for case in evals.evals:
            dir_name = task_dir_name(evals.skill_name, case.id, case.name)
            source = f"{evals.skill_name} eval {case.id} ({evals_path})"
            if dir_name in seen:
                raise TaskNameCollision(
                    f"duplicate task name {dir_name!r}: {seen[dir_name]} vs {source}"
                )
            seen[dir_name] = source
            tasks.append(
                TaskSpec(
                    task_dir=dir_name,
                    skill_name=evals.skill_name,
                    case=case,
                    harbor=evals.harbor,
                    paths=resolved[case.id],
                    workspace_dir=workspace_dir,
                    env_overrides=env_overrides,
                )
            )

    return RunPlan(
        options=opts,
        tasks=tuple(tasks),
        skill_dirs=tuple(skill_dir for _, _, skill_dir in loaded),
        declared_kwargs=declared_kwargs,
        config_out=config_out,
        sources=tuple(
            (evals.skill_name, evals_path, skill_dir)
            for evals_path, evals, skill_dir in loaded
        ),
    )


def apply_run(plan: RunPlan) -> RunResult:
    """Execute a plan: generate tasks atomically, remove stale ones, write config.

    Raises the underlying error on the first failing task; tasks generated so
    far and any pre-existing config stay in place.
    """
    opts = plan.options
    tasks_dir = opts.out / "tasks"

    created: list[TaskWrite] = []
    for task in plan.tasks:
        fixtures = generate_task_atomic(task, tasks_dir / task.task_dir)
        created.append(TaskWrite(task_dir=task.task_dir, fixtures=tuple(fixtures)))

    stale_removed: list[str] = []
    expected = {task.task_dir for task in plan.tasks}
    if tasks_dir.is_dir():
        for stale in sorted(p for p in tasks_dir.iterdir() if p.is_dir()):
            if stale.name not in expected:
                shutil.rmtree(stale)
                stale_removed.append(stale.name)

    config = build_config(
        tasks_dir=tasks_dir,
        skill_dirs=list(plan.skill_dirs),
        kwargs=opts.agent_kwargs,
        declared_kwargs=plan.declared_kwargs,
        without_skill=opts.without_skill,
        model=opts.model,
        jobs_dir=opts.jobs_dir,
        n_concurrent_trials=opts.n_concurrent,
        environment_type=opts.environment,
    )
    write_config(config, plan.config_out)

    return RunResult(
        created_tasks=tuple(created),
        stale_removed=tuple(stale_removed),
        config_written=plan.config_out,
    )
