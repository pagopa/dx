#!/usr/bin/env python3
"""Compare experiment results across all approaches and runs.

Usage:
  python compare_results.py [--md] [approach1 approach2 ...]

Options:
  --md          Print Markdown tables (default: JSON)
  approaches    Optional list of approaches to include (default: all)
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]   # dx/ root
RESULTS_DIR = ROOT / "experiments" / "results"

CHECKS = ["validate", "naming", "tags", "secrets", "networking", "modules"]
APPROACHES_ORDER = [
    "inline", "rag", "local", "mcp", "subagent", "website-crawl",
]


# ── Data loading ──────────────────────────────────────────────────────────────

def load_run(run_dir: Path) -> dict | None:
    """Load metrics + score for a single run directory."""
    m_path = run_dir / "metrics.json"
    s_path = run_dir / "score.json"
    if not m_path.exists():
        return None
    data = json.loads(m_path.read_text())
    if s_path.exists():
        score_data = json.loads(s_path.read_text())
        data["score"] = score_data.get("score", data.get("score", 0))
        data["checks"] = score_data.get("checks", {})
    return data


def load_all(filter_approaches: list[str] | None = None) -> dict[str, list[dict]]:
    """Returns {approach: [run_data, ...]} sorted by run number."""
    result: dict[str, list[dict]] = {}
    if not RESULTS_DIR.exists():
        return result
    for approach_dir in sorted(RESULTS_DIR.iterdir()):
        if not approach_dir.is_dir():
            continue
        approach = approach_dir.name
        if filter_approaches and approach not in filter_approaches:
            continue
        runs = []
        for run_dir in sorted(approach_dir.glob("run-*")):
            data = load_run(run_dir)
            if data:
                runs.append(data)
        if runs:
            result[approach] = runs
    return result


# ── Aggregation ───────────────────────────────────────────────────────────────

def _stdev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(variance)


def aggregate(runs: list[dict]) -> dict:
    scores = [r.get("score", 0) for r in runs]
    durations = [r.get("duration_s", 0) for r in runs]
    tool_calls = [r.get("tool_calls", 0) for r in runs]

    check_rates: dict[str, float] = {}
    for check in CHECKS:
        passed = sum(
            1 for r in runs
            if r.get("checks", {}).get(check, {}).get("passed", False)
        )
        check_rates[check] = passed / len(runs)

    return {
        "n_runs": len(runs),
        "avg_score": round(sum(scores) / len(scores), 2),
        "std_score": round(_stdev(scores), 2),
        "max_score": max(scores),
        "avg_duration_s": round(sum(durations) / len(durations), 1),
        "avg_tool_calls": round(sum(tool_calls) / len(tool_calls), 1),
        "check_rates": check_rates,
        "raw_scores": scores,
    }


# ── Markdown output ───────────────────────────────────────────────────────────

def _rate_emoji(rate: float) -> str:
    if rate >= 0.8:
        return "✅"
    if rate >= 0.4:
        return "⚠️"
    return "❌"


def print_markdown(data: dict[str, list[dict]]) -> None:
    all_approaches = list(APPROACHES_ORDER) + [
        a for a in data if a not in APPROACHES_ORDER
    ]
    ordered = [a for a in all_approaches if a in data]

    agg = {a: aggregate(data[a]) for a in ordered}

    # ── Summary table ──────────────────────────────────────────────────────
    print("## Experiment Results — Summary\n")
    header = "| Approach | Runs | Avg Score | ±Std | Best | Avg Duration | Avg Tool Calls |"
    sep =    "| -------- | ---- | --------- | ---- | ---- | ------------ | -------------- |"
    print(header)
    print(sep)
    for a in ordered:
        g = agg[a]
        print(
            f"| `{a}` | {g['n_runs']} | {g['avg_score']}/6 | ±{g['std_score']} "
            f"| {g['max_score']}/6 | {g['avg_duration_s']}s | {g['avg_tool_calls']} |"
        )

    # ── Per-check heatmap ───────────────────────────────────────────────────
    print("\n## Check Pass-Rate Heatmap\n")
    check_header = "| Approach | " + " | ".join(f"`{c}`" for c in CHECKS) + " | Score |"
    check_sep =    "| -------- | " + " | ".join("------" for _ in CHECKS) + " | ----- |"
    print(check_header)
    print(check_sep)
    for a in ordered:
        g = agg[a]
        cells = " | ".join(
            _rate_emoji(g["check_rates"].get(c, 0)) for c in CHECKS
        )
        print(f"| `{a}` | {cells} | {g['avg_score']}/6 |")

    # ── Raw scores per run ──────────────────────────────────────────────────
    print("\n## Raw Scores per Run\n")
    max_runs = max(len(data[a]) for a in ordered)
    run_header = "| Approach | " + " | ".join(f"Run {i+1}" for i in range(max_runs)) + " |"
    run_sep =    "| -------- | " + " | ".join("-----" for _ in range(max_runs)) + " |"
    print(run_header)
    print(run_sep)
    for a in ordered:
        scores = agg[a]["raw_scores"]
        cells = " | ".join(str(s) for s in scores) + " | " * (max_runs - len(scores))
        print(f"| `{a}` | {cells} |")


def print_json_output(data: dict[str, list[dict]]) -> None:
    agg = {a: aggregate(data[a]) for a in data}
    print(json.dumps(agg, indent=2))


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    args = sys.argv[1:]
    use_md = "--md" in args
    args = [a for a in args if a != "--md"]
    filter_approaches = args if args else None

    data = load_all(filter_approaches)
    if not data:
        print("No results found in", RESULTS_DIR, file=sys.stderr)
        sys.exit(1)

    if use_md:
        print_markdown(data)
    else:
        print_json_output(data)


if __name__ == "__main__":
    main()
