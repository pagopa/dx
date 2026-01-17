---
description: This file describes the TypeScript code style for tests.
applyTo: "**/*.test.ts, **/*.spec.ts"
---

# Copilot Guidelines for Testing TypeScript Code

## Purpose

These guidelines explain our expectations for TypeScript unit and integration tests. They aim to keep tests readable, reliable, and fast while preserving type-safety and maintainability.

## General Rules

- **Location**: Place tests next to the code they exercise in a **tests** folder near the source file. Prefer co-location to keep context close.
- **Test runner**: Use `vitest` as the test runner for all TypeScript projects in the monorepo.
- **No unsafe casts**: Never use `as` or other type-assertions to silence TypeScript errors in tests. If types are painful to express, fix the production types or create minimal, strongly-typed test helpers.
- **Arrange-Act-Assert**: Structure tests with clear Arrange, Act, and Assert sections. Keep each test focused on one behavior.
- **Descriptive names**: Test names should describe expected behavior (e.g., "returns 400 when email is invalid").
- **Avoid implementation coupling**: Tests should verify observable behavior, not internal implementation details.
- **Deterministic tests**: Avoid time-sensitive, flaky, or network-dependent tests. When needed, mock timers and external calls.

## Mocks and Isolation

- **External dependencies**: Mock external HTTP, filesystem, database, and cloud SDK calls. Prefer `vi.mock()` for module-level mocks.
- **Side effects**: Stub or spy side effects (logging, metrics, environment-dependent behavior) rather than asserting on their internal state.
- **Do not mock the unit under test**: Only mock collaborators; avoid mocking functions on the same module you're testing.

## Integration Tests

- Use integration tests sparingly for pieces that need end-to-end verification (e.g., Terraform unit tests, small service sample flows).
- Mark long-running or environment-dependent tests with explicit tags and separate them from unit tests (e.g., `vitest --config ./vitest.integration.config.ts`).

## Test Data and Fixtures

- Keep fixtures minimal and specific to the test. Avoid large fixture blobs shared across many tests.
- Use builder/factory helpers to construct objects with sensible defaults and optional overrides.

## Recommended Tools

- Test runner: `vitest`
- Assertions: `expect` from `vitest`
- Module mocks: `vi.mock()` and `vitest-mock-extended` for typed mocks
- Snapshots: Use sparingly and prefer explicit assertions over large snapshot files

## CI and Coverage

- Tests must run in CI. Use `pnpm exec nx test <project>` or `pnpm exec vitest` for package-scoped runs.
- Keep tests fast: aim for unit tests to complete in under a few seconds each. Slow tests should be marked and run separately.
- Maintain coverage thresholds per project. If a project requires a change to thresholds, open a PR documenting the rationale.

## When To Fix Code vs Tests

- If a test is hard to write because of tight coupling or poor types, prefer refactoring the production code to be more testable.
- Never change tests to match broken production behavior without a clear justification and a corresponding issue or comment.

## Linting and Formatting

- Tests are subject to the same linting and formatting rules as production code. Run `pnpm exec nx lint <project>` and `pnpm format` before opening PRs.
