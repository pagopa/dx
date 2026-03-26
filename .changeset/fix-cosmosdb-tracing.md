---
"@pagopa/azure-tracing": patch
---

Fix missing CosmosDB HTTP dependency telemetry in ESM environments caused by an `import-in-the-middle` version mismatch introduced by PR #1485.

**Root cause**: When `import-in-the-middle` (iitm) is upgraded independently of `@azure/monitor-opentelemetry`, multiple incompatible iitm versions coexist in the dependency tree. Each iitm version has completely isolated internal state, so the ESM hook loader registered by `@pagopa/azure-tracing` (using its direct iitm dep) is incompatible with the hooks registered by `@azure/monitor-opentelemetry`'s built-in `HttpInstrumentation`. The HTTP hooks never reach the active ESM loader, silently dropping all `http`/`https` spans — including CosmosDB calls.

**Fix**: The direct `import-in-the-middle` dependency in `@pagopa/azure-tracing` must always match the iitm version that `@azure/monitor-opentelemetry` uses internally. Since `@azure/monitor-opentelemetry@1.16.0` depends on `@opentelemetry/instrumentation@^0.208.0` which requires `import-in-the-middle@^2.0.0`, the direct dep is now pinned to `^2.0.0`.

Changed:
- `import-in-the-middle`: `^3.0.0` → `^2.0.0` (align with `@azure/monitor-opentelemetry@1.16.0`'s internal iitm version)
- `tracesPerSecond: 0` comment updated to clarify intent
