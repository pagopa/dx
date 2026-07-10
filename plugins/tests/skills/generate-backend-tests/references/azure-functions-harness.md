# Azure Functions shared runtime harness

Prerequisite: read `azure-harness.md`. This covers Functions runtime concerns shared by integration and record-replay.

## Boundary and bootstrap

Prefer the real local Functions host or equivalent containerized runtime. Drive the same route or trigger seam a local caller would use; do not import handlers directly when a credible host exists.

Workflow:

1. Start or attach to the real local Functions runtime.
2. If the repo ships a credible Functions container/Dockerfile, treat it as the default and try it first (usually via Testcontainers). Do not choose `func start` only because it is simpler; switch only with a concrete blocker or user approval.
3. If no credible app container exists, or the user approved another shape, allocate a free local port, build with the repo command, and run `func start --port <dynamic-port>` with PATH preserved.
4. Wait on a real route/trigger seam, not just an open port.
5. Drive scenarios through the runtime boundary.

For readiness, pick the lightest route available. Avoid deep health endpoints that fan out to every dependency. Any HTTP response can prove host liveness; connection errors/timeouts mean not ready.

## When not to force full host

If import-time client construction or credential validation has no credible local equivalent, do not bend production code only to make `func start` pass.

- Keep full host for contracts depending on route wiring, middleware, auth, serialization, triggers, or bindings that can boot honestly.
- For integration only, a mixed suite may call a real wrapper/handler with real Azure SDK request/context objects, keep storage/queue side effects live, and stub only external dependencies.
- For record-replay, do not fall back to exported handlers or wrapper return values. Report blocked or ask to switch workflow.
- State which scenarios use full host vs narrower slices.
- If a checked-in Functions container was not reused, report user approval or the concrete blocker.

## Environment checklist

Verify:

- `FUNCTIONS_WORKER_RUNTIME`
- `AzureWebJobsStorage`
- binding connection names declared in `app.http`, `app.storageQueue`, `app.cosmosDB`, `app.serviceBusTopic`, `output.storageBlob`, etc.
- `%ENV_NAME%` placeholders resolved through harness env; literal binding names kept literal
- fixed queues, topics, subscriptions, blobs, and containers pre-created exactly where bindings point

For queue triggers, create the trigger queue and matching `-poison` queue when local dead-lettering is possible. Pre-create every queue/blob container used by HTTP handlers too, including resources found via `new QueueClient(...)` / `new ContainerClient(...)` in startup paths.

## Function auth keys

For `authLevel: "function"` or `"admin"`:

- Preferred: set `AzureWebJobsSecretStorageType=files` and write `Secrets/host.json` with a known master key before startup; add `Secrets/` to `.gitignore`.
- Fallback: if secret storage cannot be overridden, poll Azurite at `azure-webjobs-secrets/<app-name>/host.json`, then pass the key with `x-functions-key` or `?code=`.
- Skip key handling for anonymous routes.

Minimal `Secrets/host.json` shape:

```json
{
  "masterKey": { "name": "master", "value": "<known-test-key>", "encrypted": false },
  "functionKeys": []
}
```

`/admin/functions/<name>` is useful for diagnostics, not the default seam for queue/blob/broker/timer scenarios that local topology can drive honestly.

## Trigger isolation

For HTTP-focused flows, disable unrelated queue/blob/timer functions when they would consume the artifact you need to assert or record:

```text
AzureWebJobs.<FunctionName>.Disabled=true
```

Persist the disabled list in topology/cassette metadata when relevant.

## Queue payload quirks

Before simplifying fixtures, confirm what the runtime passes to the function:

- decoded JSON object
- text that is itself base64-encoded JSON
- poison queue behavior when decoding fails

If logs show `Message decoding has failed! Check MessageEncoding settings.`, suspect a harness mismatch. Match the real trigger contract even if the test payload is less convenient. For record-replay, keep encoding facts in harness or `topology.json`; do not normalize them away.

## Application Insights and outbound SharedKey auth

If Azurite blob writes through `azure-storage` v2 fail with
`Server failed to authenticate the request`, check whether Application Insights initialized before
the write. The SDK can monkey-patch Node's `http` module and inject `request-id`/`x-ms-request-id`
after SharedKey signing; the extra `x-ms-*` header changes the canonical headers string and breaks
strict SharedKey verification.

For local `func start` harnesses, prevent telemetry auto-instrumentation before app code imports:
load a small CJS preload with `NODE_OPTIONS=--require <shim>` that stubs `applicationinsights`, or
otherwise disable HTTP dependency collection at import time. A dummy connection string or
`APPINSIGHTS_DISABLE=true` may stop sending telemetry but is not enough if `http` was already
patched.

## Fallback wrapper shape

Use only when no stronger repo container/convention exists. A minimal `func start` wrapper should:

- preserve env and PATH
- build once via the repo command
- use a dynamic port
- capture host logs
- wait on a cheap real probe
- stop cleanly with `SIGINT`
- keep tests pointed at the runtime boundary
- extend with key polling only when scenarios need function/admin auth
