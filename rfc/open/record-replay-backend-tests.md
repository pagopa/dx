# RFC: Record and Replay Characterization Tests for Backend Refactoring

## Context

Product teams often need to refactor backend code to improve maintainability,
performance, or to integrate new capabilities.

In large refactors, the main risk is not only changing the code, but preserving
the system's observable behavior: HTTP contracts, queue messages, persisted
data, outbound calls, and other side effects that matter to clients and
adjacent systems.

Existing test suites are not always sufficient to protect this behavior. In
legacy or distributed backends, many tests are tightly coupled to implementation
details and tend to become fragile precisely when a refactor changes framework
plumbing, module boundaries, or dependency wiring.

## Motivation

Heavy refactors, such as framework or library migrations, require automated
regression tests that can quickly tell whether the current behavior has drifted.
However, creating and maintaining regression suites for complex backends is
often time-consuming and error-prone, especially when tests need to be rewritten
alongside the code they are supposed to protect.

This RFC is explicitly out of scope for unit tests supporting lightweight
refactors or new feature development. Those tests remain valuable, but they are
not the primary goal of this proposal. The focus here is on significant backend
refactors where existing tests may also need to change, making them a weak
guardrail for preserving the current system behavior.

### North stars

- **Fast and reliable feedback** during backend refactors in the local
  development environment. Coding agents should quickly detect whether a
  refactor introduced regressions.
- **Lower time and effort to create and maintain regression coverage**. Coding
  agents should be able to generate characterization tests automatically, with
  limited manual intervention from software engineers.

## Proposal

Adopt record-and-replay **characterization tests** (also known as approval,
golden master, snapshot, or black-box tests) to freeze the current behavior of
a backend before a refactor and compare it with the behavior observed after the
refactor.

These tests should exercise the system through its **real local runtime
boundary** whenever a credible local runtime exists: for example a running HTTP
service, a local Azure Functions host, or a worker process attached to a local
broker or emulator. Directly importing handlers or application internals should
be considered only as a fallback when no honest local execution path is
available.

The characterization harness should also remain **black-box at source level**.
It should not import application models, decoders, generated types, helpers, or
runtime-coupled shared packages from the system under test. Instead, it should
rely on protocol-level payloads, local schemas, raw JSON fixtures, OpenAPI
examples, and direct reads from local dependencies.

To make the workflow reliable and reusable, the suite should build the smallest
honest local topology needed for each scenario:

- local stubs, fakes, or proxies for outbound HTTP dependencies;
- Testcontainers-managed services or local emulators for stateful dependencies
  such as storage, databases, caches, queues, and brokers;
- repository Dockerfiles, compose files, or local startup scripts reused as
  topology inputs, not necessarily as the harness implementation.

Each scenario should be recorded as a set of small, reviewable cassette
artifacts, typically split into:

- `request.json`
- `response.json`
- `side-effects.json`
- `topology.json`
- `normalization.json`

This split keeps the contract readable and makes it easier to review what was
actually frozen: the canonical input, the observed output, the side effects
read back from local dependencies, the relevant runtime topology, and the
normalization rules applied to unstable values such as timestamps, generated
IDs, trace headers, or dynamic ports.

The workflow should expose two explicit modes:

- **record**, which intentionally captures or refreshes cassette artifacts;
- **verify**, which reruns the same scenario and fails on drift without mutating
  the stored cassette.

Within this model, coding agents can:

- inspect the codebase and infrastructure-as-code to identify the real runtime
  boundary, key functionality, external dependencies, and side effects;
- bootstrap the local test environment with the required fixtures and
  emulators;
- freeze nondeterministic values through shared normalization rules;
- generate and maintain black-box regression suites that continue to work even
  when the backend is heavily refactored internally.

As a first implementation, the `record-replay-backend-tests` skill provides an
automated workflow for building this type of suite. It is currently focused on
TypeScript backends running in Azure environments, but the overall approach is
applicable to other languages and runtime platforms as well.
