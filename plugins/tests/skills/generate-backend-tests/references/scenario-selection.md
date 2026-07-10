# Scenario selection

Read before choosing path or writing harness code.

## Goal

Turn the prompt and repository evidence into a compact, decision-friendly scenario menu. Do not jump from "add tests" to broad implementation.

## Inputs

Inspect:

- user-stated contract, regressions, and side effects
- nearby tests, fixtures, payloads, OpenAPI/examples
- runtime boundaries: HTTP routes, Functions triggers, workers, adapters

## What to propose

Offer 3 to 6 scenario classes, not an exhaustive matrix. Good options often include:

- one meaningful runtime happy path
- one caller-visible error/validation path
- one side-effect scenario involving storage/cache/queue/broker
- one named regression branch
- one smaller slice for dense variation where full runtime repeats framework setup

For each option, state: scenario name, boundary, fit (`integration`, `record-replay`, or `both`), and why it is worth test cost.

Recommended response shape:

1. likely path recommendation
2. 3 to 6 scenario options
3. direct ask for path and scenarios, only if not already decided

## Avoid over-scope

- Do not convert every nearby unit test.
- Do not bundle all happy paths and all errors into one suite.
- Do not force `both` when one path is enough.
- Do not propose scenarios whose only value is preserving mock-shaped assertions.

If the prompt names a regression/endpoint, anchor on it and add only materially helpful adjacent options. If it strongly implies one path, recommend it first but let the user choose.

## If user chooses `both`

Keep overlap small:

- integration owns ongoing happy paths and durable contract checks
- record-replay owns freeze-before-refactor or black-box characterization scenarios
- only a small set, if any, deserves both

## Blocked scenarios

If a strong `record-replay`/`both` candidate depends on a boundary that cannot be exercised honestly, do not force it through a dishonest fallback. Prefer an adjacent scenario that reuses the harness while protecting the same runtime shape, flow, or side effect, and state the swap plainly.
