# harbor-mod

harbor-mod turns a skill's evals (`evals.json`) into runnable Harbor benchmark
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
collected artifacts.
_Avoid_: attempt, iteration

**Job**:
A benchmark run's output directory (`jobs/<run>`): a set of trials produced by
one `harbor run -c config.yaml`.
_Avoid_: run, result set
