"""Render the Harbor Comparison report.

The comparison data — the typed :class:`~harbor_mod.compare.Report` and
:class:`~harbor_mod.compare.ReportSummary` values, the metric registry, and the
join/aggregation in :mod:`harbor_mod.compare` — is renderer-agnostic: the
:class:`~harbor_mod.compare.ReportSummary` carries the numbers any consumer
shares. This module is where that data becomes output. :func:`render_markdown`
is the human-facing deep module behind ``harbor-mod compare`` — one function
in, a complete report out — and :func:`render_json` emits the same numbers as a
JSON document for machine consumers. The number/delta formatting rules
(:func:`_fmt`, :func:`_delta`), the run-configuration cells
(:func:`_render_run_config`), and the skill-reproduction ``git diff`` command
(:func:`_skill_diff_command`) are implementation behind the Markdown
interface.
"""

from __future__ import annotations

from typing import Any

from harbor_mod.compare import JobMeta, Report, metric_specs, summarize
from harbor_mod.jobs import SkillVersion, TrialMetrics


def _skill_diff_command(skill: SkillVersion) -> str | None:
    """A ready-to-run ``git diff`` between the remote skill version and the local checkout.

    Compares the working tree (the locally tested skill) against the git ref the
    remote run loaded (``pagopa/dx@<sha>``), restricted to the skill path. Runs
    from anywhere inside the repo thanks to the ``rev-parse`` substitution.
    """
    if skill.kind != "git" or not skill.ref or not skill.rel_path:
        return None
    return (
        f'git -C "$(git rev-parse --show-toplevel)" diff {skill.ref} '
        f"-- {skill.rel_path}"
    )


def _fmt(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "pass" if value else "FAIL"
    if isinstance(value, float):
        if abs(value) < 1:
            return f"{value:.3f}"
        return f"{value:,.2f}"
    if isinstance(value, int):
        return f"{value:,}"
    return str(value)


def _delta(base: Any, head: Any) -> str:
    """Delta string (head - base); for booleans show the transition."""
    if base is None and head is None:
        return "—"
    if base is None:
        return f"(new) {_fmt(head)}"
    if head is None:
        return f"(only base) {_fmt(base)}"
    if isinstance(base, bool) or isinstance(head, bool):
        if base == head:
            return _fmt(base)
        return f"{_fmt(base)} → {_fmt(head)}"
    if isinstance(base, float) or isinstance(head, float):
        diff = (head or 0.0) - (base or 0.0)
        return f"{diff:+,.3f}" if abs(diff) < 1 else f"{diff:+,.2f}"
    if isinstance(base, int) or isinstance(head, int):
        diff = (head or 0) - (base or 0)
        return f"{diff:+,}"
    return "—"


def _render_run_config(
    base_job: str,
    head_job: str,
    base_meta: JobMeta | None,
    head_meta: JobMeta | None,
) -> list[str]:
    """Render the job-level run configuration section (models, skills, diff)."""
    if base_meta is None and head_meta is None:
        return []

    def _model_cell(meta: JobMeta | None) -> str:
        if meta is None or meta.agent_model is None:
            return "—"
        effort = f" (effort: {meta.agent_effort})" if meta.agent_effort else ""
        return f"{meta.agent_model}{effort}"

    def _judge_cell(meta: JobMeta | None) -> str:
        if meta is None or meta.judge_model is None:
            return "—"
        effort = f" (effort: {meta.judge_effort})" if meta.judge_effort else ""
        return f"{meta.judge_model}{effort}"

    def _skills(meta: JobMeta | None) -> str:
        if meta is None or not meta.skills:
            return "—"
        return "<br>".join(f"{s.name} {s.version}" for s in meta.skills)

    lines = ["## Run configuration", ""]
    lines.append(f"| | {base_job} | {head_job} |")
    lines.append("|---|---|---|")
    lines.append(f"| agent model | {_model_cell(base_meta)} | {_model_cell(head_meta)} |")
    lines.append(f"| judge model | {_judge_cell(base_meta)} | {_judge_cell(head_meta)} |")
    lines.append(f"| skills | {_skills(base_meta)} | {_skills(head_meta)} |")
    lines.append("")

    git_cmds = [
        (skill, run)
        for meta, run in ((base_meta, base_job), (head_meta, head_job))
        if meta is not None
        for skill in meta.skills
        if _skill_diff_command(skill) is not None
    ]
    if git_cmds:
        lines.append("Skill diff (local working tree vs. git-loaded version):")
        lines.append("")
        lines.append("```bash")
        for skill, run in git_cmds:
            cmd = _skill_diff_command(skill)
            lines.append(f"# {run} · {skill.name} {skill.version}")
            lines.append(cmd or "")
        lines.append("```")
        lines.append("")
    return lines


def render_markdown(
    base_job: str,
    head_job: str,
    report: Report,
    base_meta: JobMeta | None = None,
    head_meta: JobMeta | None = None,
) -> str:
    """Render the comparison as a Markdown report."""
    base_map = {r.task: r.base for r in report.rows if r.base}
    head_map = {r.task: r.head for r in report.rows if r.head}
    specs = metric_specs(base_map, head_map)

    lines = [
        f"# Skill comparison: `{base_job}` → `{head_job}`",
        "",
        "Delta is **head − base**. ",
        "",
    ]
    lines.extend(_render_run_config(base_job, head_job, base_meta, head_meta))

    # --- Per-task tables -------------------------------------------------
    lines.append("## Per-task delta")
    lines.append("")
    for row in report.rows:
        task = row.task
        base, head = row.base, row.head
        lines.append(f"### {task}")
        lines.append("")
        lines.append("| metric | base | head | Δ |")
        lines.append("|---|---|---|---|")
        for spec in specs:
            lines.append(
                f"| {spec.display_label} | {_fmt(base.metric(spec.key)) if base else '—'} | "
                f"{_fmt(head.metric(spec.key)) if head else '—'} | "
                f"{_delta(base.metric(spec.key) if base else None, head.metric(spec.key) if head else None)} |"
            )
        lines.append("")

    # --- Summary ---------------------------------------------------------
    summary = summarize(report, specs)
    lines.append("## Summary")
    lines.append("")
    lines.append(
        f"- tasks in base: {summary.base_tasks}; in head: {summary.head_tasks}"
    )
    lines.append(
        f"- tasks only in base: {summary.base_only}; "
        f"only in head: {summary.head_only}"
    )
    for line in summary.lines:
        lines.append(
            f"- {line.spec.display_label}: {line.spec.summary_word} "
            f"{_fmt(line.base)} → {_fmt(line.head)}"
        )
    lines.append(
        f"- passed trials: {summary.base_passed}/{summary.base_tasks} → "
        f"{summary.head_passed}/{summary.head_tasks}"
    )
    lines.append("")

    return "\n".join(lines)


def _skill_dict(skill: SkillVersion) -> dict[str, Any]:
    """One skill's version facts as a JSON-able dict."""
    return {
        "name": skill.name,
        "kind": skill.kind,
        "path": skill.path,
        "repo": skill.repo,
        "ref": skill.ref,
        "rel_path": skill.rel_path,
        "version": skill.version,
    }


def render_json(
    base_job: str,
    head_job: str,
    report: Report,
    base_meta: JobMeta | None = None,
    head_meta: JobMeta | None = None,
) -> dict[str, Any]:
    """Render the comparison as a JSON document (a serializable dict).

    Shares the same numbers as :func:`render_markdown`: the metric registry
    supplies the per-task keys and the summary lines, so both formats are
    derived from one declaration. The run configuration is always present
    (with ``None`` fields when a side reports nothing), keeping the document
    shape stable for consumers.
    """
    base_map = {r.task: r.base for r in report.rows if r.base}
    head_map = {r.task: r.head for r in report.rows if r.head}
    specs = metric_specs(base_map, head_map)
    summary = summarize(report, specs)

    def _agent(meta: JobMeta | None) -> dict[str, Any] | None:
        if meta is None:
            return None
        return {"model": meta.agent_model, "effort": meta.agent_effort}

    def _judge(meta: JobMeta | None) -> dict[str, Any] | None:
        if meta is None:
            return None
        return {"model": meta.judge_model, "effort": meta.judge_effort}

    def _skills(meta: JobMeta | None) -> list[dict[str, Any]]:
        if meta is None or not meta.skills:
            return []
        return [_skill_dict(skill) for skill in meta.skills]

    def _trial_side(metrics: TrialMetrics | None) -> dict[str, Any] | None:
        if metrics is None:
            return None
        return {
            **{spec.key: metrics.metric(spec.key) for spec in specs},
            "passed": metrics.passed,
        }

    return {
        "base_job": base_job,
        "head_job": head_job,
        "run_config": {
            "agent": {"base": _agent(base_meta), "head": _agent(head_meta)},
            "judge": {"base": _judge(base_meta), "head": _judge(head_meta)},
            "skills": {"base": _skills(base_meta), "head": _skills(head_meta)},
            "skill_diffs": [
                {
                    "run": run,
                    "skill": skill.name,
                    "version": skill.version,
                    "command": command,
                }
                for meta, run in ((base_meta, base_job), (head_meta, head_job))
                if meta is not None
                for skill in meta.skills
                if (command := _skill_diff_command(skill)) is not None
            ],
        },
        "tasks": [
            {
                "task": row.task,
                "base": _trial_side(row.base),
                "head": _trial_side(row.head),
            }
            for row in report.rows
        ],
        "summary": {
            "base_tasks": summary.base_tasks,
            "head_tasks": summary.head_tasks,
            "base_only": summary.base_only,
            "head_only": summary.head_only,
            "base_passed": summary.base_passed,
            "head_passed": summary.head_passed,
            "metrics": [
                {
                    "key": line.spec.key,
                    "label": line.spec.display_label,
                    "base": line.base,
                    "head": line.head,
                }
                for line in summary.lines
            ],
        },
    }
