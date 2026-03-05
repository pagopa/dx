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
from typing import Optional, Dict, List

ROOT = Path(__file__).resolve().parents[2]   # dx/ root
RESULTS_DIR = ROOT / "experiments" / "results"

CHECKS_DETERMINISTIC = [
    "validate", "naming", "tags", "secrets", "modules",
    "dx_modules_coverage", "modules_version", "file_structure",
    "dx_provider", "no_github_sources", "variable_descriptions",
    "createdby_terraform", "azurerm_4x", "storage_azuread", "naming_config_fields",
    "outputs_grouped",
]
CHECKS_LLM = ["completeness", "security", "code_quality", "dx_adherence"]
APPROACHES_ORDER = [
    "inline", "rag", "local", "mcp", "subagent", "website-crawl",
]


# ── Data loading ──────────────────────────────────────────────────────────────

def load_run(run_dir: Path) -> Optional[Dict]:
    """Load metrics + score for a single run directory."""
    m_path = run_dir / "metrics.json"
    s_path = run_dir / "score.json"
    if not m_path.exists():
        return None
    try:
        data = json.loads(m_path.read_text())
    except json.JSONDecodeError as e:
        print(f"[WARN] Invalid JSON in {m_path}: {e}", file=sys.stderr)
        return None
    if s_path.exists():
        try:
            score_data = json.loads(s_path.read_text())
            data["score"] = score_data.get("score", data.get("score", 0))
            data["score_max"] = score_data.get("max", 20)
            data["checks"] = score_data.get("checks", {})
        except json.JSONDecodeError as e:
            print(f"[WARN] Invalid JSON in {s_path}: {e}", file=sys.stderr)
    llm_path = run_dir / "llm_score.json"
    if llm_path.exists():
        try:
            llm_data = json.loads(llm_path.read_text())
            data["llm_score"] = llm_data.get("llm_score", 0)
            data["llm_score_max"] = llm_data.get("llm_max", 40)
            data["llm_dimensions"] = llm_data.get("dimensions", {})
        except json.JSONDecodeError as e:
            print(f"[WARN] Invalid JSON in {llm_path}: {e}", file=sys.stderr)
    return data


def load_all(filter_approaches: Optional[List[str]] = None) -> Dict[str, List[Dict]]:
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

def _stdev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(variance)


def aggregate(runs: List[Dict]) -> Dict:
    scores = [r.get("score", 0) for r in runs]
    durations = [r.get("duration_s", 0) for r in runs]
    tool_calls = [r.get("tool_calls", 0) for r in runs]

    check_rates: Dict[str, float] = {}
    for check in CHECKS_DETERMINISTIC:
        passed = sum(
            1 for r in runs
            if r.get("checks", {}).get(check, {}).get("pass", False)
        )
        check_rates[check] = passed / len(runs)

    llm_scores = [r.get("llm_score", 0) for r in runs]
    llm_dim_rates: Dict[str, float] = {}
    for dim in CHECKS_LLM:
        vals = [r.get("llm_dimensions", {}).get(dim, {}).get("score", 0) for r in runs]
        llm_dim_rates[dim] = round(sum(vals) / len(vals), 1) if vals else 0.0

    score_max = runs[0].get("score_max", 20) if runs else 20

    return {
        "n_runs": len(runs),
        "avg_score": round(sum(scores) / len(scores), 2),
        "std_score": round(_stdev(scores), 2),
        "max_score": max(scores),
        "score_max": score_max,
        "avg_duration_s": round(sum(durations) / len(durations), 1),
        "avg_tool_calls": round(sum(tool_calls) / len(tool_calls), 1),
        "check_rates": check_rates,
        "raw_scores": scores,
        "avg_llm_score": round(sum(llm_scores) / len(llm_scores), 1),
        "llm_dim_rates": llm_dim_rates,
    }


# ── Markdown output ───────────────────────────────────────────────────────────

def _rate_emoji(rate: float) -> str:
    if rate >= 0.8:
        return "✅"
    if rate >= 0.4:
        return "⚠️"
    return "❌"


def print_markdown(data: Dict[str, List[Dict]]) -> None:
    from datetime import datetime, timezone
    all_approaches = list(APPROACHES_ORDER) + [
        a for a in data if a not in APPROACHES_ORDER
    ]
    ordered = [a for a in all_approaches if a in data]

    agg = {a: aggregate(data[a]) for a in ordered}

    # ── Document header ────────────────────────────────────────────────────
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    n_approaches = len(ordered)
    max_runs = max(len(data[a]) for a in ordered) if ordered else 1
    models = {r.get("model", "?") for a in ordered for r in data[a]}
    judge_models = {r.get("judge_model", "?") for a in ordered for r in data[a]} - {"?"}
    model_str = ", ".join(sorted(models))
    judge_str = ", ".join(sorted(judge_models)) if judge_models else "n/a"
    print(f"# DX Terraform Skill — Knowledge Retrieval Strategy Comparison\n")
    print(f"**Generation model**: `{model_str}`  **Judge model**: `{judge_str}`  **Approaches**: {n_approaches}  **Runs**: {max_runs} per approach  **Generated**: {today}\n")
    print("**Task**: Generate a root Terraform module for Azure (Function App + Storage Account + Cosmos DB) following PagoPA DX requirements.\n")
    print("**Scoring**: Deterministic /16 (automated checks) + LLM Judge /40 (completeness, security, code quality, DX adherence).\n")
    print("---\n")

    # ── Summary table ──────────────────────────────────────────────────────
    print("## Experiment Results — Summary\n")
    header = "| Approach | Runs | Avg Score | ±Std | Best | Avg Duration | Avg Tool Calls | Avg LLM/40 |"
    sep =    "| -------- | ---- | --------- | ---- | ---- | ------------ | -------------- | ---------- |"
    print(header)
    print(sep)
    for a in ordered:
        g = agg[a]
        sm = g['score_max']
        print(
            f"| `{a}` | {g['n_runs']} | {g['avg_score']}/{sm} | ±{g['std_score']} "
            f"| {g['max_score']}/{sm} | {g['avg_duration_s']}s | {g['avg_tool_calls']} "
            f"| {g['avg_llm_score']}/40 |"
        )

    # ── Deterministic check heatmap ────────────────────────────────────────
    print("\n## Deterministic Check Pass-Rate Heatmap\n")
    check_header = "| Approach | " + " | ".join(f"`{c}`" for c in CHECKS_DETERMINISTIC) + " | Score |"
    check_sep =    "| -------- | " + " | ".join("------" for _ in CHECKS_DETERMINISTIC) + " | ----- |"
    print(check_header)
    print(check_sep)
    for a in ordered:
        g = agg[a]
        sm = g['score_max']
        cells = " | ".join(
            _rate_emoji(g["check_rates"].get(c, 0)) for c in CHECKS_DETERMINISTIC
        )
        print(f"| `{a}` | {cells} | {g['avg_score']}/{sm} |")

    # ── LLM judge heatmap ──────────────────────────────────────────────────
    print("\n## LLM Judge Scores (avg across runs, out of 10 each)\n")
    llm_header = "| Approach | " + " | ".join(f"`{d}`" for d in CHECKS_LLM) + " | Total/40 |"
    llm_sep =    "| -------- | " + " | ".join("------" for _ in CHECKS_LLM) + " | -------- |"
    print(llm_header)
    print(llm_sep)
    for a in ordered:
        g = agg[a]
        cells = " | ".join(
            str(g["llm_dim_rates"].get(d, 0)) for d in CHECKS_LLM
        )
        print(f"| `{a}` | {cells} | {g['avg_llm_score']} |")

    # ── Raw scores per run ──────────────────────────────────────────────────
    print("\n## Raw Scores per Run\n")
    max_runs = max(len(data[a]) for a in ordered)
    run_header = "| Approach | " + " | ".join(f"Run {i+1} (det/llm)" for i in range(max_runs)) + " |"
    run_sep =    "| -------- | " + " | ".join("-----------" for _ in range(max_runs)) + " |"
    print(run_header)
    print(run_sep)
    for a in ordered:
        runs = data[a]
        cells = " | ".join(f"{r.get('score',0)}/{r.get('score_max',20)} det, {r.get('llm_score',0)}/40 llm" for r in runs)
        print(f"| `{a}` | {cells} |")

    # ── Combined ranking ────────────────────────────────────────────────────
    COMBINED_MAX = 60  # 20 det + 40 llm
    print("\n## Combined Ranking (det/16 + LLM/40 = /56)\n")
    combined = [(a, round(agg[a]['avg_score'] + agg[a]['avg_llm_score'], 1)) for a in ordered]
    combined.sort(key=lambda x: x[1], reverse=True)
    print("| Rank | Approach | Det/16 | LLM/40 | Combined/56 | % |")
    print("| ---- | -------- | ------ | ------ | ----------- | - |")
    for rank, (a, total) in enumerate(combined, 1):
        g = agg[a]
        pct = round(total / COMBINED_MAX * 100)
        print(f"| {rank} | `{a}` | {g['avg_score']}/{g['score_max']} | {g['avg_llm_score']}/40 | {total}/{COMBINED_MAX} | {pct}% |")


def print_json_output(data: Dict[str, List[Dict]]) -> None:
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
