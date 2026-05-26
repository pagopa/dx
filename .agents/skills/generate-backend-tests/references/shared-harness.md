# Shared harness strategy

Use for the common local topology behind integration and record-replay.

## Inspect first

Before coding, identify:

1. test runner, config, and command conventions
2. real inbound surface: HTTP runtime, Azure Functions host/trigger, worker/broker, scheduler, or smaller adapter/repository seam
3. local startup path and any checked-in runtime container, Dockerfile, devcontainer task, startup script, or env docs
4. dependencies each scenario needs
5. nearby tests, fixtures, payloads, known regressions, and existing live harnesses
6. whether a tiny runtime probe can answer the next uncertainty before reading dependency internals

## Probe and delegate sparingly

When behavior is uncertain, prefer a 5-10 line runtime probe using repo examples and loaded references. Read dependency source only if the probe stays ambiguous and would affect boundary, env, or readiness choices.

Use subagents only for bounded independent probes, such as a Testcontainers smoke bootstrap, reachability check, runtime startup quirk, or existing container reuse check. Keep routing, scenario selection, and harness design in the main thread. Ask for compressed evidence: conclusion, minimal proof, files/commands, and the decision it unlocks.

## Boundary choice

Pick the smallest honest boundary for the contract.

| Situation                                                    | Preferred boundary                             | Avoid                                           |
| ------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------- |
| HTTP route, middleware, auth, serialization, headers, status | full local runtime                             | direct handler import when the server can run   |
| Azure Functions trigger, binding, or runtime output          | local Functions host/equivalent runtime        | direct handler call when a credible host exists |
| worker or consumer on broker messages                        | real local worker plus broker/emulator         | mocks that only call the handler                |
| repository/storage/cache/client adapter                      | smaller integration slice plus real dependency | full host just for CRUD/mapping                 |
| one host proof plus many variations                          | mixed boundaries                               | forcing every branch through the host           |

## Dependency strategy

Classify each dependency before implementing.

| Dependency                                    | Preferred technique                                       | Observe through                           |
| --------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| `.env.test` cloud connection                  | cloud service when probe passes; local fallback otherwise | cloud/local read-back helper              |
| partner HTTP service                          | deterministic local stub/fake/proxy                       | stub-observed request and system response |
| storage, DB, cache, queue, broker             | Testcontainers dependency or credible emulator            | real local read-back                      |
| runtime component with checked-in env/startup | reuse that runtime shape                                  | exposed real boundary                     |
| no credible local path                        | documented fallback                                       | closest honest local seam                 |

If the faithful strategy is viable but materially harder, ask before using a fallback. This is strict when the repo ships a credible runtime container or startup definition:

- treat it as the default candidate
- "faster/easier" is not a blocker; name a concrete technical failure or ask the user
- present the faithful option first, fallback second, and document the decision
- only fall back without asking when the stronger path is concretely blocked

## Runtime containers

When a checked-in Dockerfile/container/devcontainer task credibly owns app env and startup, reuse that runtime shape rather than rebuilding startup in tests. Treat the app runtime as another topology component; keep the harness focused on readiness, traffic, and side-effect reads. If you choose a different runtime, ask unless blocked and record why.

## Testcontainers policy

Testcontainers is the standard orchestration path for containerized dependencies.

- Prefer official modules.
- Add `testcontainers` when absent and the dependency can credibly run that way.
- Do not infer unavailability from a missing local `docker` CLI; run a tiny real bootstrap and surface the exact failure.
- Keep orchestration in Testcontainers helpers/setup, not shell-driven Docker commands.
- Read Dockerfiles, image definitions, scripts, and env docs as topology inputs.
- Reuse containerized app runtimes in the same harness strategy.
- Before forcing `linux/amd64`, inspect the image manifest and host architecture; prefer native images.

## Devcontainer reachability

Do not assume published ports are reachable at `127.0.0.1` from Codespaces/devcontainers.

- Probe from the test process: `127.0.0.1`, `host.docker.internal`, Docker bridge gateway, and explicit override env.
- Persist or expose the chosen host path.
- Treat "port published" and "harness can reach it" separately.
- If published ports are unreliable, attach the workspace container to the dependency network and use aliases.
- If inherited Docker config points at a missing credential helper, set `DOCKER_CONFIG` to a minimal writable directory before Node/Vitest imports anything; `globalSetup` may be too late.

## Environment and object construction

Validate env before startup/import-time config:

- compare example env files, local settings, READMEs, config modules, and infrastructure defaults
- inject a complete env map explicitly when hints are stale
- use syntactically valid local URLs, IDs, connection strings, flags, container/db/broker names, and service identifiers even when the scenario does not use each dependency

For JS/TS harness classes, avoid eager class-field initialization for SDK clients or handles that depend on later fields. Use constructor assignment, setup methods, or lazy getters.

## Readiness and assertions

Prove readiness at the level the scenario needs:

- good: real endpoint response, warmup write/readback on the exact storage path, stub responding on the exact route
- weak: open port, "container started", account-level probe for container-level scenarios

Assert observable behavior:

- prefer status/headers/body, outbound requests captured by stubs, real rows/docs/blobs/keys/messages, and meaningful boundary failures
- avoid mock counts, spy assertions, and implementation-shaped expectations

## Cross-cutting rules

- Reuse an existing live harness/shared setup for the same boundary; do not create a parallel one.
- Split support modules by dependency family only when one file would own startup, readiness, connection metadata, and fixtures for two or more stateful dependencies. Keep orchestrators thin; do not explode cohesive single-purpose helpers.
- Add one brief architectural comment near non-obvious topology modules such as runtime harnesses, stubs, dependency fallbacks, cassette helpers, or adapters. Avoid repetitive inline comments.
- When using both integration and record-replay, share container startup and connection metadata. Let integration own durable live assertions; let record-replay own cassettes, normalization, `record` / `verify`, and characterization helpers. Split suites/projects only when lifecycle or include patterns differ.

## Final decision check

Proceed only when:

1. the boundary matches the protected contract
2. each dependency has an explicit strategy
3. containerized dependencies use Testcontainers
4. side effects are observable through the real local seam
5. existing harnesses are reused when they already cover the boundary
