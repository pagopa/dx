#!/usr/bin/env python3
"""harbor-bench CLI: runtime converter from evals.json to Harbor tasks.

Usage::

    harbor-bench convert [--evals PATH ...] [--out DIR] [--config-out FILE]
                       [--without-skill] [--model MODEL]
                       [--environment docker|apple-container]
    harbor-bench diff <job-base> <job-head> [--report out.md]
    harbor-bench compare [-t PATTERN]... <base-skill> <head-skill>

``convert`` reads the agentskills.io ``evals/evals.json`` files (scanned from
``plugins/**/skills/*/evals/`` by default), generates one Harbor task per eval
case, and emits a ready-to-run ``config.yaml`` so ``harbor run -c config.yaml``
finds everything. Injected skills point at the raw skill directories: eval data
(``evals/`` etc.) is stripped *inside the agent container* at runtime by
``CopilotCliMod.setup()``, never on the host. The workflow itself lives in
:mod:`harbor_bench.convert.run`; this module is a thin adapter over it.

``diff`` reads two Harbor job directories (``jobs/<run>``) and prints a
per-task delta report (score, tokens, cost, steps, duration) as Markdown
(default) or JSON (``--format json``).

``compare`` runs the same eval set twice — base skill and head skill injected
into two ``harbor run`` invocations on the same config — and writes the delta
report between the two job directories. The orchestration lives in
:mod:`harbor_bench.compare.run`; this module is a thin adapter over it.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .compare.run import (
    DEFAULT_RUNS_DIR,
    CompareError,
    CompareOptions,
    run_compare,
)
from .diff import build_document, build_report
from .report import render_json, render_markdown
from .convert.config import (
    DEFAULT_MODEL,
    DEFAULT_ENVIRONMENT_TYPE,
    SUPPORTED_ENVIRONMENT_TYPES,
)
from .convert.discover import DiscoverError
from .convert.run import (
    DEFAULT_OUT,
    DEFAULT_SCAN_ROOT,
    ConvertOptions,
    apply_run,
    check_host_environment,
    plan_run,
)
from .convert.workspace import WorkspaceError
from .jobs import Job


def cmd_convert(args: argparse.Namespace) -> int:
    options = ConvertOptions(
        out=Path(args.out),
        config_out=Path(args.config_out) if args.config_out else None,
        evals=tuple(Path(p) for p in args.evals) if args.evals else (),
        scan_root=Path(args.scan_root) if args.scan_root else DEFAULT_SCAN_ROOT,
        without_skill=args.without_skill,
        model=args.model,
        environment=args.environment,
        agent_kwargs=args.agent_kwargs,
        jobs_dir=Path(args.jobs_dir) if args.jobs_dir else None,
        n_concurrent=args.n_concurrent,
    )

    # Fail fast (before any writes) when the requested environment cannot run
    # on this host: no tasks dir, no partial config.
    if err := check_host_environment(options.environment):
        print(f"error: {err}", file=sys.stderr)
        return 1

    try:
        plan = plan_run(options)
        result = apply_run(plan)
    except (DiscoverError, WorkspaceError, ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    tasks_dir = plan.options.out / "tasks"
    for skill_name, evals_path, skill_dir in plan.sources:
        print(f">> skill '{skill_name}' ({evals_path})")
        print(f"   skill -> {skill_dir}")
    for task_write in result.created_tasks:
        if task_write.fixtures:
            print(f"   task {task_write.task_dir}: fixtures {list(task_write.fixtures)}")
        else:
            print(f"   task {task_write.task_dir}: (empty workspace)")
    for stale in result.stale_removed:
        print(f"   removed stale task {stale}")

    print(f">> generated {len(result.created_tasks)} task(s) in {tasks_dir}")
    print(f">> config: {result.config_written}")
    print(f">> environment: {options.environment}")
    if options.without_skill:
        print(">> without-skill: agent skills omitted (baseline comparison)")
    print(">> run:   harbor run -c %s -y --ae COPILOT_GITHUB_TOKEN=..." % result.config_written)
    return 0


def cmd_diff(args: argparse.Namespace) -> int:
    """Diff two Harbor job directories and emit a delta report.

    Each job is read through a single :class:`Job`, so each trial's
    ``result.json`` is parsed once and shared by the per-task metrics and the
    job-level run configuration. The joined report and both job metadata are
    folded into one :class:`~harbor_bench.diff.ReportDocument` by
    :func:`build_document`; the renderers only format it. The report is
    rendered as Markdown (``--format markdown``, default) or JSON
    (``--format json``).
    """
    base_job = Job(Path(args.base).resolve())
    head_job = Job(Path(args.head).resolve())
    report = build_report(base_job.metrics(), head_job.metrics())
    document = build_document(
        args.base,
        args.head,
        report,
        base_job.meta(),
        head_job.meta(),
    )
    if args.format == "json":
        output = json.dumps(render_json(document), indent=2) + "\n"
    else:
        output = render_markdown(document)
    if args.report:
        out = Path(args.report)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output, encoding="utf-8")
        print(f">> comparison report: {out}")
    else:
        print(output)
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    """Compare two skill versions on the same eval set (workspace vs git ref).

    One ``harbor run`` per skill on the same generated config, run in sequence
    (base first, head second) with Harbor's output streamed to the terminal,
    then the delta report between the two job directories. The orchestration
    lives in :func:`harbor_bench.compare.run.run_compare`; this function only
    maps the parsed args into
    :class:`~harbor_bench.compare.run.CompareOptions`, prints the result, and
    maps exceptions to exit codes.
    """
    options = CompareOptions(
        base_skill=args.base,
        head_skill=args.head,
        task_patterns=tuple(args.task_patterns),
        scan_root=Path(args.scan_root) if args.scan_root else DEFAULT_SCAN_ROOT,
        out=Path(args.out) if args.out else DEFAULT_OUT,
        runs_dir=Path(args.runs_dir) if args.runs_dir else DEFAULT_RUNS_DIR,
        run_id=args.run_id,
        environment=args.environment,
        model=args.model,
        n_concurrent=args.n_concurrent,
        task_globs=tuple(args.task_glob.split()) if args.task_glob else (),
        token=args.token,
    )
    try:
        result = run_compare(options)
    except (CompareError, DiscoverError, WorkspaceError, ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print()
    print(">> done.")
    print(f">>   base: {result.base_job}")
    print(f">>   head: {result.head_job}")
    print(f">>   report: {result.report}")
    print(f">>   browse: harbor view {result.run_dir}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="harbor-bench",
        description="PagoPA Harbor extensions: convert evals.json to Harbor tasks.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    conv = sub.add_parser("convert", help="generate Harbor tasks + config.yaml from evals.json")
    conv.add_argument(
        "--evals",
        nargs="+",
        help="explicit evals.json paths (default: scan plugins/**/skills/*/evals/)",
    )
    conv.add_argument(
        "--scan-root",
        help="scan root for evals.json discovery (default: plugins)",
    )
    conv.add_argument("--out", default=str(DEFAULT_OUT), help="output dir (default: .harbor)")
    conv.add_argument("--config-out", help="config.yaml output path (default: <out>/config.yaml)")
    conv.add_argument(
        "--without-skill",
        action="store_true",
        help="omit agent skills (baseline comparison, no skill injection)",
    )
    conv.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Copilot model passed to the agent (model_name; default: {DEFAULT_MODEL})",
    )
    conv.add_argument(
        "--environment",
        default=DEFAULT_ENVIRONMENT_TYPE,
        choices=SUPPORTED_ENVIRONMENT_TYPES,
        help=(
            "Harbor environment used to run the agent trials (and the separate "
            "verifier when enabled): 'docker' (default) or 'apple-container' "
            "(Apple-silicon Mac + container CLI required)"
        ),
    )
    conv.add_argument(
        "--ak",
        dest="agent_kwargs",
        nargs="+",
        default=None,
        metavar="KEY=VALUE",
        help="agent kwargs passed verbatim (same contract as harbor --ak)",
    )
    conv.add_argument("--jobs-dir", help="Harbor output dir (default: jobs)")
    conv.add_argument("--n-concurrent", type=int, default=4, help="n_concurrent_trials")
    conv.set_defaults(func=cmd_convert)

    cmp = sub.add_parser(
        "diff",
        help="diff two Harbor job directories and print a delta report",
    )
    cmp.add_argument("base", help="base job directory (e.g. jobs/<run-a>)")
    cmp.add_argument("head", help="head job directory (e.g. jobs/<run-b>)")
    cmp.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="report format (default: markdown)",
    )
    cmp.add_argument(
        "--report",
        help="write the report (in the --format) to this path instead of stdout",
    )
    cmp.set_defaults(func=cmd_diff)

    cmp = sub.add_parser(
        "compare",
        help="compare two skill versions (workspace vs git ref) on the same eval set",
        description=(
            "Run the same eval set twice on one generated config — the base skill "
            "injected into the first `harbor run`, the head skill into the second — "
            "and write the delta report between the two job directories. Skills are "
            "local paths (skill dir or root of skill dirs) or git sources "
            "(org/repo[@ref], or https://github.com/org/repo/tree/<ref>/<subdir>)."
        ),
    )
    cmp.add_argument("base", help="base skill: local path or git source")
    cmp.add_argument("head", help="head skill: local path or git source")
    cmp.add_argument(
        "-t",
        "--task-pattern",
        action="append",
        default=[],
        dest="task_patterns",
        metavar="PATTERN",
        help="run only tasks whose name matches PATTERN (glob); repeatable",
    )
    cmp.add_argument(
        "--scan-root",
        default=str(DEFAULT_SCAN_ROOT),
        help="scan root for evals.json discovery (default: plugins)",
    )
    cmp.add_argument(
        "--out",
        default=str(DEFAULT_OUT),
        help="convert output dir (default: .harbor)",
    )
    cmp.add_argument(
        "--runs-dir",
        default=str(DEFAULT_RUNS_DIR),
        help="parent dir for the two job runs (default: runs)",
    )
    cmp.add_argument(
        "--run-id",
        help="stable run id (default: a fresh timestamp)",
    )
    cmp.add_argument(
        "--task-glob",
        help=(
            "explicit task glob(s) to filter the eval set (space-separated); "
            "used only when -t/--task-pattern is not given"
        ),
    )
    cmp.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Copilot model passed to the agent (default: {DEFAULT_MODEL})",
    )
    cmp.add_argument(
        "--environment",
        default=DEFAULT_ENVIRONMENT_TYPE,
        choices=SUPPORTED_ENVIRONMENT_TYPES,
        help=(
            "Harbor environment used to run the agent trials: 'docker' "
            "(default) or 'apple-container'"
        ),
    )
    cmp.add_argument(
        "--n-concurrent",
        type=int,
        default=4,
        help="n_concurrent_trials (default: 4)",
    )
    cmp.add_argument(
        "--token",
        help="GitHub token passed to the agent (--ae COPILOT_GITHUB_TOKEN=...)",
    )
    cmp.set_defaults(func=cmd_compare)

    return parser


def _parse_kwargs(pairs: list[str] | None) -> dict | None:
    if not pairs:
        return None
    out: dict = {}
    for pair in pairs:
        key, sep, value = pair.partition("=")
        if not sep:
            raise ValueError(f"expected KEY=VALUE, got: {pair!r}")
        if value.isdigit():
            value = int(value)
        else:
            try:
                value = float(value)
            except ValueError:
                pass
        out[key] = value
    return out


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if hasattr(args, "agent_kwargs"):
            args.agent_kwargs = _parse_kwargs(args.agent_kwargs)
        return args.func(args)
    except (ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
