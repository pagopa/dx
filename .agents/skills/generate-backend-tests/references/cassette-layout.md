# Multilayer cassette layout

Use one folder per scenario so request, response, topology, side effects, and normalization remain reviewable and refreshable.

```text
cassettes/
  <scenario-name>/
    request.json
    response.json
    side-effects.json
    topology.json
    normalization.json
```

Add files only when needed, unless the repo has a stronger convention.

## Layer responsibilities

- `request.json`: canonical input sent to the running local system, such as HTTP method/path/query/headers/body, queue/topic payload and transport headers, or trigger parameters.
- `response.json`: final observable result, such as status/headers/body, acknowledgment payload, exit code, or domain result. Happy-path captures must be success-shaped and meaningfully non-trivial before writing.
- `side-effects.json`: deterministic snapshots read from local dependencies: blobs, metadata, docs, Redis keys/TTLs, broker messages, DB rows. Sort lists/docs and normalize field order. Before saying "no side effects," probe every queue, blob container, and document path the handler touches.
- `topology.json`: replay-relevant local topology: service base URL, injected dependency endpoints, feature flags, emulator names, normalized hosts/ports. Do not dump every runtime detail.
- `normalization.json`: document unstable-value handling: removed headers, rewritten hosts/ports, timestamp/ID placeholders, array sort rules, cache/DB metadata removal, runtime-assigned names. The file describes rules; shared code used by `record` and `verify` enforces them.

Normalization must recurse into arrays as well as plain objects, or dynamic fields inside array elements will drift.

## Redaction

Redact in code before writing each layer; do not rely on manual review. Normalize/remove:

- auth, API key, function key, cookie, and set-cookie headers
- connection strings, account keys, SAS tokens, bearer tokens, signed URLs, instrumentation keys, webhook secrets
- query params such as `code`, `sig`, `client_secret`, `access_token`, `token`
- full env dumps, SDK client configs, topology fields with credentials

Use stable placeholders such as `<REDACTED_BEARER_TOKEN>`. After recording, scan cassette files for known secret values loaded from `.env`, `.env.test`, `local.settings.json`, and test config before committing.

## Relationship to record/verify

This file defines cassette contents, determinism, and safety. `record-replay-workflow.md` owns orchestration, boundary rules, and blocked-path decisions.

## Tips

- Keep each scenario focused on one contract shape.
- Prefer a few high-value scenarios over one giant cassette.
- After first record, sanity-check happy responses and payloads/side effects.
- Keep emulator compatibility handling in local capture-time adapters or seams, not production models.
- Parse/compare cassette content with characterization-local helpers or plain JSON, not target app decoders/generated types or runtime-coupled packages.
- Keep cassette folders near fixtures unless another established layout is clearly better.
