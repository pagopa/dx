#!/usr/bin/env python3
"""harbor-mod CLI: runtime converter from evals.json to Harbor tasks.

Usage::

    harbor-mod convert [--evals PATH ...] [--out DIR] [--config-out FILE]
                       [--without-skill] [--model MODEL]

Reads the agentskills.io ``evals/evals.json`` files (scanned from
``plugins/**/skills/*/evals/`` by default), stages the skills for injection,
generates one Harbor task per eval case, and emits a ready-to-run
``config.yaml`` so ``harbor run -c config.yaml`` finds everything.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .convert import task as task_module
from .convert.config import build_config, write_config
from .convert.discover import DiscoverError, find_evals_files, load_evals_file
from .convert.schema import resolve_eval_paths
from .convert.workspace import WorkspaceError
from .staging import stage_skills

DEFAULT_OUT = Path(".harbor")
DEFAULT_SCAN_ROOT = Path("plugins")


def _task_dir_name(skill_name: str, case_id: int, case_name: str | None) -> str:
    import re

    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", (case_name or f"eval-{case_id}").strip()).strip("-")
    return f"{skill_name}-{slug}"


def cmd_convert(args: argparse.Namespace) -> int:
    out = Path(args.out).resolve()
    config_out = Path(args.config_out).resolve() if args.config_out else (out / "config.yaml")

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
    skills_dir = out / "skills"
    staged: list[Path] = []
    total_tasks = 0

    try:
        for evals_path in evals_paths:
            evals, skill_dir = load_evals_file(evals_path)
            print(f">> skill '{evals.skill_name}' ({evals_path})")
            staged.append(stage_skill := stage_skills([skill_dir], skills_dir)[0])
            print(f"   staged skill -> {stage_skill}")

            per_eval = resolve_eval_paths(evals, skill_dir)
            workspace_dir = None
            if evals.harbor.workspace_dir:
                workspace_dir = (skill_dir / evals.harbor.workspace_dir).resolve()

            for case in evals.evals:
                task_root = tasks_dir / _task_dir_name(
                    evals.skill_name, case.id, case.name
                )
                paths = per_eval[case.id]
                env_overrides: dict | None = None
                if args.without_skill:
                    env_overrides = {
                        "verifier": {
                            "env": {"SKILL_EVAL_ENFORCE_SKILL_USE": "false"}
                        }
                    }
                try:
                    created = task_module.generate_task(
                        evals_file=evals,
                        case_id=case.id,
                        task_root=task_root,
                        workspace_dir=workspace_dir,
                        overlays=paths["overlays"],
                        files=paths["files"],
                        prepare_script=paths["prepare_script"],
                        env_overrides=env_overrides,
                        overrides=paths["overrides"],
                    )
                except WorkspaceError as exc:
                    print(f"error: task '{task_root.name}': {exc}", file=sys.stderr)
                    return 1
                total_tasks += 1
                if created:
                    print(f"   task {task_root.name}: fixtures {created}")
                else:
                    print(f"   task {task_root.name}: (empty workspace)")
    except (DiscoverError, WorkspaceError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    config = build_config(
        tasks_dir=tasks_dir,
        skill_dirs=staged,
        kwargs=args.agent_kwargs,
        without_skill=args.without_skill,
        model=args.model,
        jobs_dir=Path(args.jobs_dir).resolve() if args.jobs_dir else None,
        n_concurrent_trials=args.n_concurrent,
    )
    write_config(config, config_out)

    print(f">> generated {total_tasks} task(s) in {tasks_dir}")
    print(f">> config: {config_out}")
    if args.without_skill:
        print(">> without-skill: agent skills omitted (baseline comparison)")
    print(">> run:   harbor run -c %s -y --ae COPILOT_GITHUB_TOKEN=..." % config_out)
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
    conv.add_argument("--model", help="Copilot model passed to the agent (model_name)")
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
