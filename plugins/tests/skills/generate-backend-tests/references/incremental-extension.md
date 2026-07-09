# Incremental extension

Use when the user asks to add tests, widen coverage, or continue an existing backend-test harness.

## Goal

Preserve context by starting from stable re-entry artifacts instead of rediscovering topology.

## Re-entry order

Read in order and stop broadening once the next decision is clear:

1. backend-test/coverage report
2. package or runner scripts
3. shared harness entrypoints: `global-setup`, `harness`, `support/`, `record` / `verify`
4. one representative suite for the same path
5. only nearby fixtures/helpers/app files needed for new scenarios

If these explain boundary, dependencies, and scenario inventory, skip repo-wide discovery.

## Source of truth

- Existing harness/report define current path unless the prompt changes it.
- Scenario table defines current coverage and natural gaps.
- Rerun commands/setup files define how to exercise the harness.

Use a concise Markdown report as the default persistent snapshot. Add machine-readable manifests only when the repo already has that pattern or the user asks.

## Scenario proposals

For vague additive prompts, propose 2 to 4 gap-filling scenarios from the report's gaps, current boundary, and user prompt. If reading `scenario-selection.md`, use it as methodology only; do not restart broad inspection.

Rules:

- If prompt names `integration`, `record-replay`, or `both`, keep it unless impossible/dishonest.
- If prompt names scenarios, do not reopen selection.
- If prompt says "add edge cases" or "widen coverage," propose focused gaps from current artifacts.

## Revisit topology only when

- user asks to switch workflows
- new scenario crosses a boundary the harness cannot honestly cover
- dependency strategy now blocks the requested scenario
- report/harness is too ambiguous to trust

Otherwise extend the existing harness.

## Update after changes

Update the report with new scenarios, file locations, helpers/setup files, changed commands, and remaining intentional gaps.

Avoid repo-wide rereads, repeated path selection, parallel harnesses, and long historical summaries.
