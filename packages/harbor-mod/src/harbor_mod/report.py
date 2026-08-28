"""Render the Harbor Comparison report.

The comparison data — the complete :class:`~harbor_mod.compare.ReportDocument`
(rows, metric specs, aggregated summary, run-configuration cells), built once
by :func:`~harbor_mod.compare.build_document` — is renderer-agnostic: every
consumer shares the same numbers. This module is where that document becomes
output. :func:`render_markdown` and :func:`render_json` are pure adapters over
the document — they only format, never compute. The number/delta formatting
rules (:func:`_fmt`, :func:`_delta`) and the run-configuration table
(:func:`_render_run_config`) are implementation behind the adapters.
"""

from __future__ import annotations

from typing import Any

from harbor_mod.compare import JobMeta, ReportDocument
from harbor_mod.jobs import SkillVersion, TrialMetrics


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


def _render_run_config(document: ReportDocument) -> list[str]:
    """Render the job-level run configuration section (models, skills, diff)."""
    if document.base_meta is None and document.head_meta is None:
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
    lines.append(f"| | {document.base_job} | {document.head_job} |")
    lines.append("|---|---|---|")
    lines.append(
        f"| agent model | {_model_cell(document.base_meta)} | {_model_cell(document.head_meta)} |"
    )
    lines.append(
        f"| judge model | {_judge_cell(document.base_meta)} | {_judge_cell(document.head_meta)} |"
    )
    lines.append(
        f"| skills | {_skills(document.base_meta)} | {_skills(document.head_meta)} |"
    )
    lines.append("")

    if document.skill_diffs:
        lines.append("Skill diff (local working tree vs. git-loaded version):")
        lines.append("")
        lines.append("```bash")
        for diff in document.skill_diffs:
            lines.append(f"# {diff.run} · {diff.skill.name} {diff.skill.version}")
            lines.append(diff.command)
        lines.append("```")
        lines.append("")
    return lines


def render_markdown(document: ReportDocument) -> str:
    """Render a report document as a Markdown report.

    Pure adapter: everything rendered (the metric specs, the summary numbers,
    the run-configuration skill diffs) was computed once by
    :func:`~harbor_mod.compare.build_document`.
    """
    lines = [
        f"# Skill comparison: `{document.base_job}` → `{document.head_job}`",
        "",
        "Delta is **head − base**. ",
        "",
    ]
    lines.extend(_render_run_config(document))

    # --- Per-task tables -------------------------------------------------
    lines.append("## Per-task delta")
    lines.append("")
    for row in document.rows:
        task = row.task
        base, head = row.base, row.head
        lines.append(f"### {task}")
        lines.append("")
        lines.append("| metric | base | head | Δ |")
        lines.append("|---|---|---|---|")
        for spec in document.specs:
            lines.append(
                f"| {spec.display_label} | {_fmt(spec.read(base)) if base else '—'} | "
                f"{_fmt(spec.read(head)) if head else '—'} | "
                f"{_delta(spec.read(base) if base else None, spec.read(head) if head else None)} |"
            )
        lines.append("")

    # --- Summary ---------------------------------------------------------
    summary = document.summary
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


def render_json(document: ReportDocument) -> dict[str, Any]:
    """Render a report document as a JSON document (a serializable dict).

    Pure adapter over a :class:`~harbor_mod.compare.ReportDocument`: the
    metric registry supplies the per-task keys and the summary lines, so the
    document is derived from one declaration. The run configuration is always
    present (with ``None`` fields when a side reports nothing), keeping the
    document shape stable for consumers.
    """
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
            **{spec.key: spec.read(metrics) for spec in document.specs},
            "passed": metrics.passed,
        }

    return {
        "base_job": document.base_job,
        "head_job": document.head_job,
        "run_config": {
            "agent": {"base": _agent(document.base_meta), "head": _agent(document.head_meta)},
            "judge": {"base": _judge(document.base_meta), "head": _judge(document.head_meta)},
            "skills": {"base": _skills(document.base_meta), "head": _skills(document.head_meta)},
            "skill_diffs": [
                {
                    "run": diff.run,
                    "skill": diff.skill.name,
                    "version": diff.skill.version,
                    "command": diff.command,
                }
                for diff in document.skill_diffs
            ],
        },
        "tasks": [
            {
                "task": row.task,
                "base": _trial_side(row.base),
                "head": _trial_side(row.head),
            }
            for row in document.rows
        ],
        "summary": {
            "base_tasks": document.summary.base_tasks,
            "head_tasks": document.summary.head_tasks,
            "base_only": document.summary.base_only,
            "head_only": document.summary.head_only,
            "base_passed": document.summary.base_passed,
            "head_passed": document.summary.head_passed,
            "metrics": [
                {
                    "key": line.spec.key,
                    "label": line.spec.display_label,
                    "base": line.base,
                    "head": line.head,
                }
                for line in document.summary.lines
            ],
        },
    }
