# harbor-bench

harbor-bench turns a skill's evals (`evals.json`) into runnable Harbor benchmark
tasks, runs a Copilot CLI agent on them, and compares trial metrics across
benchmark runs.

## Language

**Skill**:
A plugin directory under evaluation (`plugins/**/skills/*/`), identified by
`SKILL.md`; its `evals/evals.json` is the source of truth for the benchmark.
_Avoid_: plugin

**Eval case**:
One test case in `evals.json`: a prompt, an expected output, and optional
expectations, fixtures, and overlays.
_Avoid_: eval, test, benchmark case

**Task**:
A runnable Harbor task directory generated for one eval case (`task.toml`,
`instruction.md`, `environment/`, `tests/`, `solution/`).
_Avoid_: job, run

**Fixture**:
A workspace file staged for the agent from the skill dir, via one of three
layers: base workspace, overlay directory, or single file.
_Avoid_: file, asset

**Suite metadata**:
The `harbor` block of `evals.json`: base image, judge model, timeouts, verifier
mode, artifacts, and overrides.
_Avoid_: config, harbor block

**Agent**:
The Copilot CLI session under evaluation. The custom `CopilotCliMod` agent is
the harness that runs it.
_Avoid_: model, copilot

**Verifier**:
The grading step that produces a trial's reward. Its **judge** is the LLM
(RewardKit) that scores the trial.
_Avoid_: grader, scorer

**Trial**:
One agent run within a job: one subdirectory holding a `result.json` and the
collected artifacts. The `jobs` module encapsulates the trial-directory layout
and the `result.json` schema via a single `TrialArtifacts` value (the one owner
of every artifact location): a `Trial` loads its artifacts once into a
`TrialFacts` value and exposes typed `metrics()` and `meta()` accessors rather
than the raw dict. `copilot_usage` is a pure adapter: it aggregates whatever
two files it is handed and never sees a trial path.
_Avoid_: attempt, iteration

**Job**:
A benchmark run's output directory (`jobs/<run>`): a set of trials produced by
one `harbor run -c config.yaml`. The `jobs` module is the deep seam for
reading one job: a `Job` reads its directory once into a cached trial list and
derives the per-task metrics (`metrics()`) and the job-level run configuration
(`meta()`) from that single read.
_Avoid_: run, result set

**Comparison report**:
The per-task delta report produced by the `harbor-bench diff` command from two
jobs: a
typed `Report` of `TrialComparison` rows (one per task, base/head side), plus
the run-configuration section. Its metrics are declared once in the metrics
module's registry (`METRIC_SPECS`): each entry carries the derivation half
(the `result.json` key and the `CopilotUsage` attribute `Trial` backfills
from) and the reporting half (key, label, and total/mean aggregation), with
verifier rewards added dynamically as `score.<key>` metrics. An import-time
check (`validate_metric_specs`, wired into `jobs.py` and the agent) makes that
"once" enforceable: every registry key must name a `TrialMetrics` field and
every usage attribute a `CopilotUsage` field, so a drift fails at import, not
on a live trial. The rows, metric specs, aggregated summary, and
run-configuration skill diffs are folded into one `ReportDocument` by
`build_document`. The `comparison_presentation` module is the report's
interpretation seam: it computes comparable-task-only verdicts and metrics,
task outcomes, display values, and per-skill source associations once. The
Markdown, HTML, and JSON adapters serialize that shared presentation through
the `render_report` interface. Whole-job totals remain separate from
comparable-task statistics, so added or removed tasks cannot skew the verdict.
Harbor trial directories with a `trial.log` but no `result.json` are retained
as `incomplete` results; their attempt suffix is removed before joining the two
jobs, so interrupted runs remain visible instead of producing an empty report.
_Avoid_: delta sheet

**Package version**:
The release version lives in `pyproject.toml` at `[project].version`. The Nx
Python plugin owns version increments; `project.json` does not duplicate or
override that behavior. At runtime, `harbor_bench.__version__` reads the
installed Python distribution metadata.
_Avoid_: duplicate version
