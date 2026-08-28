"""Orchestrate a two-run skill comparison (workspace vs git ref).

``harbor-bench compare <base-skill> <head-skill>`` runs the same eval set twice
on the same generated config — the base skill injected into the first
``harbor run``, the head skill into the second (per-skill last-wins) — then
writes a delta report between the two job directories.

The workflow lives behind one entry point:

``run_compare(options) -> CompareResult``
    Resolves and validates both skills, generates the task set + config by
    reusing the convert seam (``plan_run``/``apply_run``), narrows the eval set
    to the skill under test, runs ``harbor run`` twice in sequence (base then
    head, output streamed to the terminal), and diffs the two jobs by reusing
    the diff seam (``build_report``/``build_document`` + the Markdown
    renderer).

The CLI is a thin adapter over this seam: it parses args and env overrides into
:class:`CompareOptions`, prints from the returned result, and maps exceptions
to exit codes. ``harbor run`` is the only external process invoked; convert and
diff run in-process.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, replace
from datetime import datetime
from pathlib import Path

import yaml

from harbor_bench.convert.config import (
    DEFAULT_ENVIRONMENT_TYPE,
    DEFAULT_MODEL,
    SUPPORTED_ENVIRONMENT_TYPES,
)
from harbor_bench.convert.discover import DiscoverError, find_evals_files
from harbor_bench.convert.run import (
    DEFAULT_OUT,
    DEFAULT_SCAN_ROOT,
    ConvertOptions,
    apply_run,
    check_host_environment,
    plan_run,
)
from harbor_bench.diff import build_document, build_report
from harbor_bench.jobs import Job
from harbor_bench.report import render_markdown

from .sources import SkillSource, derive_globs, parse_skill

#: Parent dir for the two job runs (``--runs-dir``).
DEFAULT_RUNS_DIR = Path("runs")

#: The two job labels within a run directory (base first, head second).
JOB_LABELS = ("base", "head")


class CompareError(ValueError):
    """A workflow-level error in the comparison (preflight or input)."""


class HarborRunError(CompareError):
    """A ``harbor run`` invocation failed with a non-zero exit code.

    Carries the failed job label and exit code; ``harbor run`` streams its own
    output to the terminal, so the failure is actionable from what is already
    on screen.
    """

    def __init__(self, label: str, returncode: int):
        self.label = label
        self.returncode = returncode
        super().__init__(f"[{label}] harbor run failed (exit {returncode})")


@dataclass(frozen=True)
class CompareOptions:
    """Inputs and knobs for one skill comparison.

    Defaults mirror the ``harbor-bench compare`` CLI defaults. ``task_globs``
    carries the ``--task-glob`` value (used only when ``task_patterns`` is
    empty) and ``token`` the ``--token`` value (passed to the agent as
    ``--ae COPILOT_GITHUB_TOKEN=...``).
    """

    base_skill: str
    head_skill: str
    task_patterns: tuple[str, ...] = ()
    scan_root: Path = DEFAULT_SCAN_ROOT
    out: Path = DEFAULT_OUT
    runs_dir: Path = DEFAULT_RUNS_DIR
    run_id: str | None = None
    environment: str = DEFAULT_ENVIRONMENT_TYPE
    model: str | None = DEFAULT_MODEL
    n_concurrent: int = 4
    task_globs: tuple[str, ...] = ()
    token: str | None = None
    harbor: str = "harbor"


@dataclass(frozen=True)
class CompareResult:
    """What :func:`run_compare` produced: the two jobs and the report."""

    run_dir: Path
    base_job: Path
    head_job: Path
    report: Path
    globs: tuple[str, ...]


def _log(message: str) -> None:
    print(f">> {message}")


def check_harbor_cli(harbor: str) -> str | None:
    """Return an error message when the ``harbor`` CLI is not on PATH."""
    if shutil.which(harbor) is not None:
        return None
    return f"'{harbor}' CLI not found on PATH (install with: uv tool install harbor)"


def _normalize_options(options: CompareOptions) -> CompareOptions:
    return replace(
        options,
        scan_root=options.scan_root.resolve(),
        out=options.out.resolve(),
        runs_dir=options.runs_dir.resolve(),
        run_id=options.run_id or datetime.now().strftime("%Y-%m-%d__%H-%M-%S"),
    )


def _write_run_config(config: Path, out: Path, globs: tuple[str, ...]) -> None:
    """Write the run config: a copy when all tasks run, else ``datasets[0].task_names``.

    ``harbor run`` consumes the same config for both jobs; narrowing the eval
    set is purely a config edit, so the generated ``config.yaml`` stays intact
    for reuse while ``config.run.yaml`` carries the task filter.
    """
    if globs == ("*",):
        out.write_bytes(config.read_bytes())
        return
    data = yaml.safe_load(config.read_text(encoding="utf-8"))
    datasets = data.setdefault("datasets", [])
    if datasets:
        datasets[0]["task_names"] = list(globs)
    out.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")


def _run_command(
    harbor: str,
    config: Path,
    jobs_dir: Path,
    label: str,
    skill: SkillSource,
    token: str | None,
) -> list[str]:
    """The ``harbor run`` command line for one job (base or head)."""
    command = [
        harbor,
        "run",
        "-c",
        str(config),
        "-y",
        "--jobs-dir",
        str(jobs_dir),
        "--job-name",
        label,
    ]
    if token:
        command += ["--ae", f"COPILOT_GITHUB_TOKEN={token}"]
    command += ["--skill", skill.reference]
    return command


def _run_job(
    harbor: str,
    config: Path,
    jobs_dir: Path,
    label: str,
    skill: SkillSource,
    token: str | None,
) -> None:
    """Run one job, streaming ``harbor run`` output to the terminal.

    Harbor's own progress is passed through untransformed so the two sequential
    runs give live feedback; a non-zero exit raises :class:`HarborRunError`.
    """
    command = _run_command(harbor, config, jobs_dir, label, skill, token)
    _log(f"[{label}] harbor run --skill {skill.reference}")
    result = subprocess.run(command)
    if result.returncode != 0:
        raise HarborRunError(label, result.returncode)


def _write_report(base_job: Path, head_job: Path, report_path: Path) -> None:
    """Delta report between two job directories (reuses the diff seam)."""
    base = Job(base_job)
    head = Job(head_job)
    report = build_report(base.metrics(), head.metrics())
    document = build_document(
        str(base_job), str(head_job), report, base.meta(), head.meta()
    )
    report_path.write_text(render_markdown(document), encoding="utf-8")


def run_compare(options: CompareOptions) -> CompareResult:
    """Run the full comparison workflow.

    Preflight — harbor CLI present, host can run the environment, both skills
    resolve, evals found — happens before anything is written. Raises
    ``CompareError``/``ValueError``/``DiscoverError``/``WorkspaceError`` on
    failure; the CLI maps them to exit codes.
    """
    opts = _normalize_options(options)

    if error := check_harbor_cli(opts.harbor):
        raise CompareError(error)
    if opts.environment not in SUPPORTED_ENVIRONMENT_TYPES:
        raise ValueError(
            f"unsupported environment type {opts.environment!r}; expected one of "
            + ", ".join(repr(t) for t in SUPPORTED_ENVIRONMENT_TYPES)
        )
    if error := check_host_environment(opts.environment):
        raise CompareError(error)

    base = parse_skill(opts.base_skill, Path.cwd())
    head = parse_skill(opts.head_skill, Path.cwd())

    evals_paths = find_evals_files(opts.scan_root)
    if not evals_paths:
        raise CompareError(
            f"no evals.json found under {opts.scan_root} — nothing to convert/compare"
        )
    _log(f"found {len(evals_paths)} evals.json file(s) under {opts.scan_root}")

    # 1. convert: evals.json -> tasks + config.yaml (reuses the convert seam)
    plan = plan_run(
        ConvertOptions(
            out=opts.out,
            config_out=opts.out / "config.yaml",
            evals=tuple(evals_paths),
            environment=opts.environment,
            model=opts.model,
            n_concurrent=opts.n_concurrent,
        )
    )
    apply_run(plan)
    _log(f"generated {len(plan.tasks)} task(s); config: {plan.config_out}")

    # 2. narrow the eval set to the skill under test
    globs = derive_globs(base, head, opts.task_patterns, opts.task_globs)
    run_config = opts.out / "config.run.yaml"
    _write_run_config(plan.config_out, run_config, globs)
    _log(f"task filter: {' '.join(globs)}")

    # 3. two sequential harbor runs (base and head skill injection)
    run_dir = opts.runs_dir / opts.run_id
    base_job, head_job = (run_dir / label for label in JOB_LABELS)
    run_dir.mkdir(parents=True, exist_ok=True)
    if opts.token:
        _log("COPILOT_GITHUB_TOKEN: set (passed via --ae)")
    else:
        _log(
            "warning: COPILOT_GITHUB_TOKEN is not set; "
            "the agent may fail to authenticate"
        )

    jobs = tuple(zip(JOB_LABELS, (base, head)))
    for label, skill in jobs:
        _run_job(opts.harbor, run_config, run_dir, label, skill, opts.token)

    # 4. delta report (reuses the diff seam)
    report_path = run_dir / "comparison.md"
    _write_report(base_job, head_job, report_path)
    _log(f"comparison report: {report_path}")

    return CompareResult(
        run_dir=run_dir,
        base_job=base_job,
        head_job=head_job,
        report=report_path,
        globs=globs,
    )
