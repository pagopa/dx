#!/usr/bin/env python3
"""harbor-mod CLI: runtime converter from evals.json to Harbor tasks.

Usage::

    harbor-mod convert [--evals PATH ...] [--out DIR] [--config-out FILE]
                       [--without-skill] [--model MODEL]
                       [--environment docker|apple-container]
    harbor-mod compare <job-base> <job-head> [--report out.md]

``convert`` reads the agentskills.io ``evals/evals.json`` files (scanned from
``plugins/**/skills/*/evals/`` by default), generates one Harbor task per eval
case, and emits a ready-to-run ``config.yaml`` so ``harbor run -c config.yaml``
finds everything. Injected skills point at the raw skill directories: eval data
(``evals/`` etc.) is stripped *inside the agent container* at runtime by
``CopilotCliMod.setup()``, never on the host. The workflow itself lives in
:mod:`harbor_mod.convert.run`; this module is a thin adapter over it.

``compare`` reads two Harbor job directories (``jobs/<run>``) and prints a
per-task delta report (score, tokens, cost, steps, duration).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .compare import build_report, meta_from_job, metrics_from_job, render_markdown
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


def cmd_compare(args: argparse.Namespace) -> int:
    """Compare two Harbor job directories and emit a delta report.

    Each job is read through a single :class:`Job`, so each trial's
    ``result.json`` is parsed once and shared by the per-task metrics and the
    job-level run configuration.
    """
    base_job = Job(Path(args.base).resolve())
    head_job = Job(Path(args.head).resolve())
    report = build_report(metrics_from_job(base_job), metrics_from_job(head_job))
    base_meta = meta_from_job(base_job)
    head_meta = meta_from_job(head_job)
    markdown = render_markdown(args.base, args.head, report, base_meta, head_meta)
    if args.report:
        out = Path(args.report)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(markdown, encoding="utf-8")
        print(f">> comparison report: {out}")
    else:
        print(markdown)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="harbor-mod",
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
        "compare",
        help="compare two Harbor job directories and print a delta report",
    )
    cmp.add_argument("base", help="base job directory (e.g. jobs/<run-a>)")
    cmp.add_argument("head", help="head job directory (e.g. jobs/<run-b>)")
    cmp.add_argument(
        "--report",
        help="write the Markdown report to this path instead of stdout",
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
