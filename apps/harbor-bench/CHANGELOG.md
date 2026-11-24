## 0.1.10 (2026-11-24)

### 🚀 Features

- Adopt Harbor 0.26's built-in `copilot-cli` agent and drop the `harbor-copilot` package. ([#2580](https://github.com/pagopa/dx/pull/2580))

  The `harbor_copilot` agent fork (`CopilotCliMod`) is gone: `harbor` moves from
  `0.22.0` to `0.26.0`, which ships the same CLI wrapper upstream, so the
  workspace now has a single `harbor` pin and one fewer member. The usage reader
  moved into `harbor_bench.copilot_usage`.

  ### Migration guide

  1. Configs produced by `harbor-bench convert` before this change still point at
     the deleted module: their `config.yaml` carries
     `agents[].import_path: harbor_copilot.agents.copilot_cli_mod:CopilotCliMod`
     instead of an agent name, and that import now fails. Regenerate the task and
     config with the current `harbor-bench convert`, which writes
     `agent.name: copilot-cli`, or edit the `config.yaml` so the entry carries
     `name: copilot-cli` in place of `import_path`. Merely removing
     `import_path` is not enough: an agent entry with neither `name` nor
     `import_path` falls back to Harbor's default `oracle` agent, which is not
     Copilot and rejects Copilot kwargs. Hand-written `harbor.yaml` files and
     eval cases that pinned `agent.name: copilot-cli-mod` need
     `agent.name: copilot-cli`.
  2. Move `agent.kwargs` to Harbor's `CopilotCliOptions` fields. Payloads that
     named `max_ai_credits`, `enable_memory`, `available_tools`, `allow_tool`, or
     `deny_tool` are now rejected (`extra="forbid"`); set
     `agent.kwargs.skip_install: true` to reuse a Copilot CLI already baked into
     the image, and keep `reasoning_effort` as before.
  3. Metrics now come from Harbor's `agent/copilot-usage.json` (and the
     `copilot-cli.jsonl` trajectory) instead of the Copilot CLI session SQLite
     database. `report`, `diff`, and `compare` show the same columns; the
     `reasoning_tokens` is read from the value Harbor persists in
     `agent_result.metadata.copilot_usage` (so a resumed trial is not
     double-counted) and falls back to the usage file; `n_requests` comes from
     the usage file, because Harbor persists no request count. Jobs recorded
     before this change keep reporting both, from the `metadata.n_reasoning_tokens`
     and `metadata.n_requests` keys the old agent wrote.
  4. Reinstalling is enough: `packages/harbor-copilot` is deleted, so drop it from
     any local script that imported the `harbor_copilot` module.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.9 (2026-11-17)

### 🚀 Features

- Include Node.js 24 and npm in generated task environments. ([#2523](https://github.com/pagopa/dx/pull/2523))

### 🩹 Fixes

- Update generated task and verifier images to Ubuntu 26.04 ([#2520](https://github.com/pagopa/dx/pull/2520))
- Fix missing LiteLLM MCP dependencies in the verifier. ([#2524](https://github.com/pagopa/dx/pull/2524))

### ❤️ Thank You

- Luca Cavallaro

## 0.1.8 (2026-10-29)

### 🩹 Fixes

- Bump dependencies ([#2422](https://github.com/pagopa/dx/pull/2422))

## 0.1.7 (2026-10-28)

### 🩹 Fixes

- Point the benchmark documentation and fixtures at the renamed `plugins/padef` ([#2425](https://github.com/pagopa/dx/pull/2425))
  skill layout.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.6 (2026-10-23)

### 🩹 Fixes

- Apply the dependency publication cooldown to the generated verifier. ([#2402](https://github.com/pagopa/dx/pull/2402))

  The workspace lock already quarantines newly published distributions through
  `[tool.uv] exclude-newer`, but `harbor-rewardkit` is installed by `uvx` inside
  the verifier container at runtime, outside that lock. Because RewardKit
  declares `litellm>=1.83` with no upper bound, a release published minutes
  earlier can land in a container that holds the judge credentials; the LiteLLM
  1.107.0 compromise is exactly that scenario. The generated `tests/test.sh` now
  exports `UV_EXCLUDE_NEWER="7 days"` before invoking `uvx`, which makes the
  verifier honour the same seven-day cooldown as the lock.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.5 (2026-10-15)

### 🩹 Fixes

- Fix the F1 skill-use gate on Copilot CLI runs: the verifier now proves skill load and invoke on the trial's ATIF trajectory (tests/skill_use.py, the same artifact the judge reads) instead of grepping the raw --output-format json stream, which Copilot CLI 1.0.97 changed by dropping the <skill-context> messages. The check pins the tested skill name, so auxiliary skills and the tool catalog can no longer satisfy or trip it. ([#2359](https://github.com/pagopa/dx/pull/2359), [#2358](https://github.com/pagopa/dx/issues/2358))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.4 (2026-10-08)

### 🩹 Fixes

- Refresh the Python dependency locks. Upgrade the uv workspace lock shared by harbor-bench and harbor-copilot (litellm, fastapi, starlette, uvicorn, pydantic, cryptography, and other transitive dependencies), and regenerate the hash-locked renew-tls-certificate requirements (cryptography 50.0.2, azure-identity 1.26.0, jwcrypto 1.6.1, msal 1.39.0, requests 2.34.2, pyjwt 2.15.1, and other transitive updates). ([#2322](https://github.com/pagopa/dx/pull/2322))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.3 (2026-10-08)

### 🚀 Features

- Add a repeatable `--skill` option to `harbor-bench compare` to inject auxiliary skills (e.g. eval dependencies) into both runs, with the tested skill always winning on name collisions, and document installing the CLI from the public repo with `uv tool install`. The agent and judge default models move to `gpt-6-luna`. The JSON comparison report now separates completion from verifier-gate outcomes: `base_completed`/`head_completed` replace the old completion-valued `base_passed`/`head_passed` fields in the `comparison` and `summary` objects, while new `base_gate_passed`/`head_gate_passed` fields expose verifier-gate results. Per-task sides keep `completed` and `eval_passed`, and the ambiguous `passed` alias is removed; the formatted key-signal cards are exposed as `comparison.signals`. ([#2309](https://github.com/pagopa/dx/pull/2309))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.2 (2026-09-09)

### 🚀 Features

- Make a skill's `harbor/` directory a pure **overlay** over the tasks ([#2163](https://github.com/pagopa/dx/pull/2163))
  `harbor-bench convert` generates, so a skill can ship its own benchmark
  harness next to `evals.json` by dropping files in place instead of relying on
  converter-discovered layout hooks.

  Precedence over a generated task: converter defaults < per-eval `files` <
  generated files < suite overlay < per-task overlay < run-level flags
  (e.g. `--without-skill`, re-applied by the converter). `evals.json` stays the
  source of truth for the eval cases.

### ❤️ Thank You

- Copilot Autofix powered by AI @Copilot
- Danilo Spinelli @gunzip

## 0.1.1 (2026-09-08)

### 🚀 Features

- Introduce a new harbor-bench app that provides CLI commands for converting, reporting, and comparing trial metrics, and align the Python packages with the monorepo release conventions (private package.json version manifests, like the Go providers). ([#2155](https://github.com/pagopa/dx/pull/2155))

### 🩹 Fixes

- Bump cryptography from 48.0.1 to 50.0.0 (with msal from 1.35.0 to 1.38.0 to keep the pinned set resolvable) in the renew-tls-certificate action requirements, and setuptools from 80.9.0 to 83.0.0 in the harbor-bench and harbor-copilot Python packages. ([#2157](https://github.com/pagopa/dx/pull/2157))

### ❤️ Thank You

- Danilo Spinelli @gunzip