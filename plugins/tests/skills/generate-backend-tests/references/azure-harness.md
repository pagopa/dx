# Azure shared harness

Prerequisite: read `shared-harness.md`. Use with runtime-specific Azure references such as `azure-functions-harness.md`.

## Dependency selection

Pick the lightest local topology that proves the contract.

| Need                         | Preferred local dependency                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Blob, queue, or table output | Azurite or existing storage emulator, via Testcontainers when containerized                                          |
| Cosmos read/write path       | Cosmos-compatible emulator or existing local Cosmos path, via Testcontainers when containerized                      |
| Azure queue/broker publish   | existing local queue/broker path, via Testcontainers when containerized, only when the scenario needs a real publish |

If a dependency cannot run locally, document the fallback and capture the closest honest boundary. For brokers, prove both runtime-side and test-side connectivity; one hostname/connection string may not work from both networks.

**Testcontainers in devcontainer:** `container.getHost()` may be the Docker bridge gateway
(e.g. `172.17.0.1`) rather than `127.0.0.1`. When a spawned runtime cannot reliably reach mapped
emulator ports, proxy each needed port from a free `127.0.0.1` `net.Server` to
`bridgeHost:mappedPort`; pass the proxied connection string to child processes and keep the direct
one for the test process.

Use `shared-harness.md` for non-Azure dependencies such as partner HTTP stubs.

## Azure env additions

Alongside generic env validation, verify Azure-local settings such as:

- `local.settings.json` values
- storage connection settings
- TLS/certificate flags required by emulators
- Cosmos connection settings
- queue/blob/table connection names

Some Azure SDK clients are lazy: startup can succeed with bad settings and fail only on first send/read. If a scenario needs a broker/Event Hubs/storage side effect, include a real operation in readiness. If no credible local path exists, route to a narrower integration seam with explicit stub/no-op only when honest, or choose another record-replay scenario.

## Cosmos emulator checks

Do not stop at TCP or vendor readiness endpoints. Prove the exact SDK path used by the app:

1. create/open the scenario database/container
2. write a probe item
3. point-read it
4. query it
5. clean probe data

Important quirks:

- Some Linux/preview emulators require `connectionPolicy.enableEndpointDiscovery = false`.
- Prove both point-read and query; query results may omit `_etag`, `_rid`, `_self`, `_ts`.
- If domain schemas need those system fields under emulator queries, add them as regular fields in test seed data only, not production code.
- If warm-up passes but higher-level helpers fail only because of emulator metadata, keep the workaround in an integration-only seam.

Warm-up lines example:

```ts
const client = new CosmosClient({
  endpoint: `http://${host}:${mappedPort}`,
  key: COSMOS_EMULATOR_KEY,
  connectionPolicy: { enableEndpointDiscovery: false },
});

await probeContainer.item("probe-item", "probe").read();
await probeContainer.items.query("SELECT * FROM c").fetchAll();
```

## Observing Azure side effects

For queues, blobs, and tables:

- read emitted artifacts from the emulator instead of spying on helper calls
- accept the emulator's transport encoding
- compare the downstream-relevant payload, not the envelope
- for queues, accept plain JSON or base64-encoded JSON when reading emitted messages
