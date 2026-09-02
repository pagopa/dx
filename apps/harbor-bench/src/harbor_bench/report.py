"""Render Harbor comparison reports through one text interface."""

from __future__ import annotations

import json
from typing import Any, Literal

from harbor_bench.comparison_presentation import (
    ComparisonPresentation,
    MetricPresentation,
    RunPresentation,
    TaskSidePresentation,
    build_presentation,
)
from harbor_bench.diff import ReportDocument

ReportFormat = Literal["markdown", "html", "json"]


def _render_run_config(presentation: ComparisonPresentation) -> list[str]:
    if not any(run.meta_present for run in presentation.run_cards):
        return []

    base, head = presentation.run_cards

    def _skills(run: RunPresentation) -> str:
        if not run.skills:
            return "—"
        return "<br>".join(f"{skill.name} {skill.version}" for skill in run.skills)

    lines = [
        "## Run configuration",
        "",
        f"| | {presentation.base_job} | {presentation.head_job} |",
        "|---|---|---|",
        f"| agent model | {base.agent} | {head.agent} |",
        f"| judge model | {base.judge} | {head.judge} |",
        f"| skills | {_skills(base)} | {_skills(head)} |",
        "",
    ]
    if presentation.skill_diffs:
        lines.extend(
            [
                "Skill diff (local working tree vs. git-loaded version):",
                "",
                "```bash",
            ]
        )
        for diff in presentation.skill_diffs:
            lines.append(f"# {diff.run} · {diff.name} {diff.version}")
            lines.append(diff.command)
        lines.extend(["```", ""])
    return lines


def render_markdown(document: ReportDocument) -> str:
    """Render the shared presentation as Markdown."""
    presentation = build_presentation(document)
    lines = [
        f"# Skill comparison: `{presentation.base_job}` → `{presentation.head_job}`",
        "",
        "Delta is **head − base**.",
        "",
    ]
    lines.extend(_render_run_config(presentation))
    lines.extend(
        [
            "## Comparable-task result",
            "",
            f"- verdict: **{presentation.verdict}**",
            f"- tasks compared: {presentation.comparable.tasks}",
            f"- completed task pairs: {presentation.comparable.evaluated_tasks}",
            f"- {presentation.score.label}: {presentation.score.base} → "
            f"{presentation.score.head} ({presentation.score.delta})",
            f"- passed trials: {presentation.comparable.base_passed}/"
            f"{presentation.comparable.evaluated_tasks} → "
            f"{presentation.comparable.head_passed}/"
            f"{presentation.comparable.evaluated_tasks}",
            "",
            "## Per-task delta",
            "",
        ]
    )
    for task in presentation.tasks:
        lines.extend(
            [
                f"### {task.name} ({task.outcome_label})",
                "",
                "| metric | base | head | Δ |",
                "|---|---|---|---|",
            ]
        )
        for metric in task.metrics:
            lines.append(
                f"| {metric.label} | {metric.base} | {metric.head} | "
                f"{metric.delta} |"
            )
        lines.append("")

    population = presentation.population
    lines.extend(
        [
            "## Whole-job summary",
            "",
            f"- tasks in base: {population.base_tasks}; "
            f"in head: {population.head_tasks}",
            f"- tasks only in base: {population.base_only}; "
            f"only in head: {population.head_only}",
        ]
    )
    for metric in presentation.summary_metrics:
        lines.append(
            f"- {metric.label}: {metric.summary_word} "
            f"{metric.base} → {metric.head}"
        )
    lines.extend(
        [
            f"- passed trials: {population.base_passed}/{population.base_tasks} → "
            f"{population.head_passed}/{population.head_tasks}",
            "",
        ]
    )
    return "\n".join(lines)


def _metric_dict(
    metric: MetricPresentation,
    population: str,
) -> dict[str, Any]:
    return {
        "key": metric.key,
        "label": metric.label,
        "population": population,
        "base": metric.base_value,
        "head": metric.head_value,
        "delta": metric.delta,
        "direction": metric.direction,
    }


def _side_dict(side: TaskSidePresentation | None) -> dict[str, Any] | None:
    if side is None:
        return None
    return {
        **side.values,
        "passed": side.passed,
        "status": side.status,
    }


def render_json(document: ReportDocument) -> str:
    """Render the shared presentation as formatted JSON text."""
    presentation = build_presentation(document)
    base_run, head_run = presentation.run_cards

    def _run_dict(run: RunPresentation) -> dict[str, Any]:
        return {"model": run.agent_model, "effort": run.agent_effort}

    def _judge_dict(run: RunPresentation) -> dict[str, Any]:
        return {"model": run.judge_model, "effort": run.judge_effort}

    def _skills(run: RunPresentation) -> list[dict[str, Any]]:
        return [
            {
                "name": skill.name,
                "kind": skill.kind,
                "path": skill.path,
                "repo": skill.repo,
                "ref": skill.ref,
                "rel_path": skill.rel_path,
                "version": skill.version,
                "source_url": skill.source_url,
            }
            for skill in run.skills
        ]

    value = {
        "base_job": presentation.base_job,
        "head_job": presentation.head_job,
        "run_config": {
            "agent": {
                "base": _run_dict(base_run) if base_run.meta_present else None,
                "head": _run_dict(head_run) if head_run.meta_present else None,
            },
            "judge": {
                "base": _judge_dict(base_run) if base_run.meta_present else None,
                "head": _judge_dict(head_run) if head_run.meta_present else None,
            },
            "skills": {
                "base": _skills(base_run),
                "head": _skills(head_run),
            },
            "skill_diffs": [
                {
                    "run": diff.run,
                    "skill": diff.name,
                    "version": diff.version,
                    "command": diff.command,
                }
                for diff in presentation.skill_diffs
            ],
        },
        "comparison": {
            "verdict": presentation.verdict,
            "comparable_tasks": presentation.comparable.tasks,
            "completed_task_pairs": presentation.comparable.evaluated_tasks,
            "base_passed": presentation.comparable.base_passed,
            "head_passed": presentation.comparable.head_passed,
            "base_success_rate": presentation.comparable.base_rate_value,
            "head_success_rate": presentation.comparable.head_rate_value,
            "primary_metric": _metric_dict(
                presentation.score,
                "comparable_tasks",
            ),
            "metrics": [
                _metric_dict(metric, "comparable_tasks")
                for metric in presentation.comparison_metrics
            ],
            "outcomes": {
                outcome.key: outcome.count
                for outcome in presentation.outcomes
            },
        },
        "tasks": [
            {
                "task": task.name,
                "outcome": task.outcome,
                "base": _side_dict(task.base_side),
                "head": _side_dict(task.head_side),
            }
            for task in presentation.tasks
        ],
        "summary": {
            "base_tasks": presentation.population.base_tasks,
            "head_tasks": presentation.population.head_tasks,
            "base_only": presentation.population.base_only,
            "head_only": presentation.population.head_only,
            "base_passed": presentation.population.base_passed,
            "head_passed": presentation.population.head_passed,
            "metrics": [
                _metric_dict(metric, "whole_job")
                for metric in presentation.summary_metrics
            ],
        },
    }
    return json.dumps(value, indent=2) + "\n"


def render_html(document: ReportDocument) -> str:
    """Render HTML without loading Jinja for other formats."""
    from harbor_bench.html_report import render_html as render_html_adapter

    return render_html_adapter(document)


def render_report(
    document: ReportDocument,
    output_format: ReportFormat,
) -> str:
    """Render a report as text, hiding adapter-specific serialization."""
    if output_format == "markdown":
        return render_markdown(document)
    if output_format == "html":
        return render_html(document)
    if output_format == "json":
        return render_json(document)
    raise ValueError(f"unsupported report format: {output_format}")
