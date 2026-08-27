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
``CopilotCliMod.setup()``, never on the host.

``compare`` reads two Harbor job directories (``jobs/<run>``) and prints a
per-task delta report (score, tokens, cost, steps, duration).
"""

from __future__ import annotations

import argparse
import platform
import shutil
import sys
from pathlib import Path

from .compare import build_report, load_job, load_job_meta, render_markdown
from .convert import task as task_module
from .convert.config import (
    DEFAULT_MODEL,
    DEFAULT_ENVIRONMENT_TYPE,
    SUPPORTED_ENVIRONMENT_TYPES,
    build_config,
    collect_declared_kwargs,
    write_config,
)
from .convert.discover import DiscoverError, find_evals_files, load_evals_file
from .convert.schema import EvalCase, EvalsFile, resolve_eval_paths
from .convert.workspace import WorkspaceError

DEFAULT_OUT = Path(".harbor")
DEFAULT_SCAN_ROOT = Path("plugins")


class TaskNameCollision(ValueError):
    """Two eval cases resolve to the same generated task name."""


def validate_environment_prerequisites(environment: str) -> str | None:
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


def cmd_convert(args: argparse.Namespace) -> int:
    out = Path(args.out).resolve()
    config_out = Path(args.config_out).resolve() if args.config_out else (out / "config.yaml")

    # Fail fast (before any writes) when the requested environment cannot run
    # on this host: no tasks dir, no partial config.
    if err := validate_environment_prerequisites(args.environment):
        print(f"error: {err}", file=sys.stderr)
        return 1

    if args.evals:
        evals_paths = [Path(p).resolve() for p in args.evals]
    else:
        scan_root = Path(args.scan_root or DEFAULT_SCAN_ROOT).resolve()
        evals_paths = find_evals_files(scan_root)
    if not evals_paths:
        print(
            f"error: no evals.json found under {args.scan_root or DEFAULT_SCAN_ROOT} "
            "(pass --evals explicitly)",
            file=sys.stderr,
        )
        return 1

    tasks_dir = out / "tasks"
    declared_kwargs: dict = {}
    skill_dirs: list[Path] = []

    try:
        # Load every evals file up front so the whole input set is validated
        # (name collisions, declared kwargs) before anything is written.
        loaded: list[tuple[Path, EvalsFile, Path]] = []
        for evals_path in evals_paths:
            evals, skill_dir = load_evals_file(evals_path)
            print(f">> skill '{evals.skill_name}' ({evals_path})")
            print(f"   skill -> {skill_dir}")
            loaded.append((evals_path, evals, skill_dir))
            skill_dirs.append(skill_dir)

        declared_kwargs = collect_declared_kwargs(
            [(evals.skill_name, evals.harbor.kwargs) for _, evals, _ in loaded]
        )

        planned: list[tuple[EvalsFile, Path, EvalCase, str]] = []
        seen: dict[str, str] = {}
        for evals_path, evals, skill_dir in loaded:
            for case in evals.evals:
                dir_name = task_module.task_dir_name(
                    evals.skill_name, case.id, case.name
                )
                source = f"{evals.skill_name} eval {case.id} ({evals_path})"
                if dir_name in seen:
                    raise TaskNameCollision(
                        f"duplicate task name {dir_name!r}: {seen[dir_name]} "
                        f"vs {source}"
                    )
                seen[dir_name] = source
                planned.append((evals, skill_dir, case, dir_name))

        total_tasks = 0
        for evals, skill_dir, case, dir_name in planned:
            per_eval = resolve_eval_paths(evals, skill_dir)
            workspace_dir = None
            if evals.harbor.workspace_dir:
                workspace_dir = (skill_dir / evals.harbor.workspace_dir).resolve()
            paths = per_eval[case.id]
            env_overrides: dict | None = None
            if args.without_skill:
                env_overrides = {
                    "verifier": {
                        "env": {"SKILL_EVAL_ENFORCE_SKILL_USE": "false"}
                    }
                }
            try:
                created = task_module.generate_task_atomic(
                    evals_file=evals,
                    case_id=case.id,
                    task_root=tasks_dir / dir_name,
                    workspace_dir=workspace_dir,
                    overlays=paths["overlays"],
                    files=paths["files"],
                    prepare_script=paths["prepare_script"],
                    env_overrides=env_overrides,
                    overrides=paths["overrides"],
                )
            except WorkspaceError as exc:
                print(f"error: task '{dir_name}': {exc}", file=sys.stderr)
                return 1
            total_tasks += 1
            if created:
                print(f"   task {dir_name}: fixtures {created}")
            else:
                print(f"   task {dir_name}: (empty workspace)")

        # Remove tasks from previous conversions that are no longer part of the
        # current input. Only the tasks dir is touched: job results (jobs_dir)
        # and the generated config are never deleted.
        if tasks_dir.is_dir():
            for stale in sorted(p for p in tasks_dir.iterdir() if p.is_dir()):
                if stale.name not in seen:
                    shutil.rmtree(stale)
                    print(f"   removed stale task {stale.name}")
    except (DiscoverError, WorkspaceError, ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    config = build_config(
        tasks_dir=tasks_dir,
        skill_dirs=skill_dirs,
        kwargs=args.agent_kwargs,
        declared_kwargs=declared_kwargs,
        without_skill=args.without_skill,
        model=args.model,
        jobs_dir=Path(args.jobs_dir).resolve() if args.jobs_dir else None,
        n_concurrent_trials=args.n_concurrent,
        environment_type=args.environment,
    )
    write_config(config, config_out)

    print(f">> generated {total_tasks} task(s) in {tasks_dir}")
    print(f">> config: {config_out}")
    print(f">> environment: {args.environment}")
    if args.without_skill:
        print(">> without-skill: agent skills omitted (baseline comparison)")
    print(">> run:   harbor run -c %s -y --ae COPILOT_GITHUB_TOKEN=..." % config_out)
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    """Compare two Harbor job directories and emit a delta report."""
    base = load_job(Path(args.base).resolve())
    head = load_job(Path(args.head).resolve())
    report = build_report(base, head)
    base_meta = load_job_meta(Path(args.base).resolve())
    head_meta = load_job_meta(Path(args.head).resolve())
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
