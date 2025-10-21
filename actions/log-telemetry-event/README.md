# Log Telemetry Event Action

Lightweight producer for workflow telemetry. Appends lines to a session NDJSON file consumed later by `setup-telemetry`.

## Why NDJSON

Using a line‑delimited JSON (NDJSON) instead of a single JSON array allows to:

- Keeping the entire structure in memory
- Array opening/closing coordination between multiple steps
- Concurrency issues (each step independently appends a line)

Each invocation adds exactly one line; the post processor (`setup-telemetry`) streams them safely.

## Prerequisite

Must be invoked after `setup-telemetry` has exported `OTEL_EVENT_FILE`. If `OTEL_EVENT_FILE` is missing the action fails.

## Inputs

| Name           | Required | Description                                                             |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `name`         | yes      | Logical event name (for custom events or exception label)               |
| `body`         | no       | Textual message/value (shown as body)                                   |
| `is_exception` | no       | `true` marks this event as an exception (span status will be set ERROR) |
| `span_name`    | no       | Child span name (hot path identifier)                                   |
| `span_phase`   | no       | `start` or `end` to delimit a child span                                |

Rules:

- If `span_name` and `span_phase` are both set, a span marker line is written instead of an event line.
- If they are absent, a standard event or exception line is written.
- `is_exception` is ignored on span marker lines.

## NDJSON Line Formats

Event / Exception:

```jsonc
{"name":"BuildCompleted","body":"42 files","exception":false}
{"name":"CompilationError","body":"tsc failed","exception":true}
```

Span Markers (child spans):

```jsonc
{"span":"build","startSpan":"2025-10-21T09:30:12.123Z"}
{"span":"build","endSpan":"2025-10-21T09:31:05.987Z"}
```

The consumer will pair `startSpan`/`endSpan` with the same `span` name in order of appearance. Multiple occurrences produce multiple child spans. Orphaned starts or ends are ignored.

## Usage Examples

### Log a simple event

```yaml
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with:
    name: Build Started
    body: "initializing"
```

### Log an exception

```yaml
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with:
    name: NpmInstallFailed
    body: "Exit code 1"
    is_exception: "true"
```

### Measure a hot path (child span)

```yaml
- name: Start build span
  uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with:
    span_name: build
    span_phase: start

# ... build steps ...

- name: End build span
  uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with:
    span_name: build
    span_phase: end
```

It is also possible to interleaving multiple spans:

```yaml
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { span_name: compile, span_phase: start }

- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { span_name: test, span_phase: start }
# ...
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { span_name: compile, span_phase: end }
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { span_name: test, span_phase: end }
```

## Error Handling

- Malformed JSON lines: skipped by consumer.
- Unknown `span_phase`: falls back to writing a regular event line.
- Missing `OTEL_EVENT_FILE`: action fails early.
