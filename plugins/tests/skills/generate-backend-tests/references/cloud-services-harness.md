# Cloud services harness

Read only when `.env.test` exists at repo root, app/package dir, a parent up to root, or a user-provided path. If absent, ignore this file and do not mention cloud services.

## Applies when

Use this when all are true:

1. `.env.test` contains connection strings/endpoints for one or more cloud services.
2. The user did not request purely local topology.
3. `shared-harness.md` dependency classification finds a matching dependency.

Cloud services give high fidelity but shared state. Probe first, never overwrite data the test did not create, and clean up surgically.

## Locate and parse `.env.test`

Search only:

1. repo root
2. current package/app dir
3. parents from package/app dir to root
4. explicit user path

If multiple files match, prefer the closest to the suite; otherwise use root and note it.

Parse as dotenv (`KEY=VALUE`, no shell expansion). Group keys by service:

- `*_CONNECTION_STRING`, `*_CONNSTRING`
- `*_ENDPOINT`
- `*_KEY`, `*_ACCOUNT_KEY`

## Probe and classify

Probe each candidate service before using it.

| Service | Probe |
| --- | --- |
| Cosmos DB | official Cosmos SDK with the same connection shape as the app; cheapest account/db operation |
| Azure Storage Blob/Queue/Table | official Storage SDK; list at most one resource or read service properties |
| Application Insights | GET ingestion health path; timeout may simply disable telemetry emission |
| Generic HTTP | `HEAD` or `GET /` |

Rules:

- hard timeout 5 seconds per probe, no retry
- run probes in parallel
- one failure does not disqualify other services; hybrid topology is allowed
- log cloud/local decisions clearly
- treat auth, DNS, TLS, SDK, and timeout failures as "local fallback" unless the scenario tests them

Classification:

```text
cloud = connection present and probe passed
local = connection absent or probe failed
```

Expose this once from setup/bootstrap so tests consume a unified topology object, not branching decisions.

## Hybrid topology

When cloud is usable, pass the `.env.test` connection string directly. When not, start the local Testcontainers/emulator/stub path from `shared-harness.md`. Do not inject cloud and local credentials for the same logical dependency at the same time.

Example shape:

```ts
interface DependencyTopology {
  cosmos: { endpoint: string; key: string; source: "cloud" | "local" };
  storage: { connectionString: string; source: "cloud" | "local" };
}
```

## Fixture isolation

Every write to shared cloud state needs a run-unique token generated once per suite, for example `test-<uuid4-short>-<slug>`.

| Resource | Isolation |
| --- | --- |
| Cosmos DB/container | Prefer existing db/container; create run-scoped containers only when needed and delete them |
| Documents/items | run-scoped IDs; cleanup by partition key + ID |
| Blobs | `test-runs/<run-token>/...`; cleanup by prefix |
| Queues | run-scoped queue names; delete queue |
| Table rows | run-scoped partition key |

Pre-existing reference data is read-only: never mutate, overwrite, or delete it.

## Cleanup

Register cleanup as resources are created, then run it in `afterAll`/`globalTeardown`.

- Use LIFO order.
- Make deletion idempotent.
- Scope deletion to the current run token only.
- Do not skip cleanup after test failure.
- If cleanup fails, warn with exact identifiers; do not mask the original assertion failure, but fail the harness when the run would otherwise pass.

After the suite, query for resources matching the current token. Fail if any remain, and include service, type, and identifiers. Never broaden cleanup to "all test resources" or old prefixes.

## Report

When cloud services are used, report:

- services probed and final source (`cloud` or `local`)
- run token strategy
- cleanup result or manual cleanup identifiers
- rerun note: `.env.test` plus reachable services enables cloud; otherwise the harness falls back locally
