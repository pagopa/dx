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