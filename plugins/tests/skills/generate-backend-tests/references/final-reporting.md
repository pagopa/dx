# Final reporting

Read after implementing and before finishing.

## Goal

Leave a short report that lets users and future prompts answer: what is covered, through which boundary, on which dependencies, and how to rerun it. The report is also the re-entry snapshot for later scenario additions.

## When required

Add/update a Markdown report for every non-trivial pass that changes tests, harness code, topology, cassettes, or scenario coverage. Common triggers:

- multiple scenarios
- shared harness, Testcontainers topology, local stubs, emulator/cloud usage
- integration and record-replay coexistence
- intentionally narrower boundary than full runtime
- likely future incremental additions

Skip only for a tiny assertion-only follow-up in an already documented suite.

## Location

Prefer:

1. existing test-coverage/workflow doc
2. focused root report, e.g. `<app>-test-report.md`, `<service>-integration-report.md`, `<component>-coverage-report.md`
3. docs folder only if the repo already uses it for engineering notes

## Contents

Keep concise and path-heavy. Typical sections:

- scope
- suite overview
- shared harness/infrastructure summary
- scenario table
- rerun commands
- current intentional gaps when relevant

The re-entry snapshot must include:

- workflow path (`integration`, `record-replay`, or `both`)
- honest boundary
- primary harness entrypoints/setup files
- dependency sources: cloud services, local emulators, Testcontainers, stubs
- scenario inventory and file locations
- rerun commands, including `record` / `verify` when relevant

Prefer tables and explicit file paths over narrative.

Scenario table columns: scenario, suite file, boundary, observable outcome, infrastructure used.

## Diagrams

Add Mermaid only when it clarifies a non-obvious flow such as request->runtime->dependency->side effect, trigger->handler->output binding, or record->cassette->verify. Skip diagrams for flows that fit in one sentence.

## Emphasize

Highlight facts hard to infer quickly:

- real emulators vs lightweight SDK-only seams
- full runtime vs intentionally narrower slice
- app runtime shape, especially if a checked-in container/Dockerfile was not reused
- integration vs record-replay scenario ownership
- shared setup/helper files

## Guardrails

- Report only coverage actually added/changed.
- Do not restate every assertion.
- Explain narrower slices and fallbacks plainly, with concrete reasons.
- If a checked-in runtime was not reused, record the skipped runtime, chosen runtime, and user approval or blocker.
- Keep it compact enough for future cheap rereads.
- Mention the report path in the final response when relevant.
