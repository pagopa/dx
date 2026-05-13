# Multilayer cassette layout

Use a folder per scenario so request, response, topology, and side effects stay reviewable and can be refreshed intentionally.

## Recommended structure

```text
cassettes/
  <scenario-name>/
    request.json
    response.json
    side-effects.json
    topology.json
    normalization.json
```

You can add extra files when the scenario needs them, but keep the core split unless the repository already has a stronger convention.

## File responsibilities

### `request.json`

Store the canonical input sent to the running local system.

Examples:

- HTTP method, path, normalized query, normalized headers, and body
- queue or topic payload plus relevant transport headers
- trigger parameters for a scheduled or event-driven process

### `response.json`

Store the final observable result returned by the local system.

For scenarios described as happy path, the recorded response should itself be success-shaped. If the live call returns a 4xx or 5xx, fix the scenario inputs, seed data, branch selection, or topology before writing the cassette. Also require a minimum meaningful success shape such as required fields or side effects; do not freeze a trivial success unless that is the real contract.

Examples:

- HTTP status, normalized headers, and body
- emitted acknowledgment payload
- final exit code or domain result when there is no HTTP response

### `side-effects.json`

Store deterministic snapshots read back from local dependencies after the scenario completes.

Examples:

- blobs or object metadata
- queried documents
- Redis keys and TTLs
- broker messages
- rows inserted into a local database

Prefer stable lists, sorted documents, and normalized field order so diffs stay readable.

### `topology.json`

Store the local topology information needed to understand or reproduce the scenario.

Examples:

- service base URL used by the capture script
- dependency endpoints injected into the service
- enabled feature flags
- emulator names
- ports or hostnames after normalization

This file is for replay reproducibility, not for dumping every runtime detail.

### `normalization.json`

Document how unstable values were normalized.

Examples:

- removed headers
- rewritten hostnames or ports
- timestamp field replacements
- generated ID placeholders
- sorting rules for arrays or result sets
- removed cache or database metadata such as `_etag`, `_rid`, `_self`, `_ts`
- placeholders for runtime-assigned ports, database names, or other topology values

Keep normalization explicit so `record` and `verify` apply the same rules. Back those rules with shared code used by both paths; `normalization.json` should describe the rules, not be their only implementation.

## Capture and verify expectations

### Record mode

`record` mode should:

1. boot the topology
2. prove dependency readiness at the level the scenario actually needs, not only at "container is listening" level
3. run the scenario
4. collect all cassette layers
5. write them deterministically

### Verify mode

`verify` mode should:

1. boot the same style of topology
2. rerun the scenario unchanged
3. collect live observations
4. compare them against the cassette layers
5. fail on drift without mutating the stored artifacts

## Practical tips

- Keep one scenario focused on one contract shape.
- Prefer a few high-value scenarios over a giant cassette with many branches.

- Redact secrets before writing any layer.
- After the first record, open the cassette files and sanity-check that the "happy" scenarios actually captured success responses with meaningful payloads or side effects.
- If the scenario needs emulator-specific compatibility handling, prefer to keep that logic in a local capture-time adapter or local runtime seam rather than folding it back into a shared production model.
- Prefer parsing and asserting cassette content with characterization-local helpers or plain JSON comparisons rather than importing the target application's own decoders or generated types, and apply the same rule to shared/runtime-coupled packages used by the system under test.
- If the repository already has fixtures, keep cassette folders nearby unless another established layout is clearly better.
