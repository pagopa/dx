# Log Telemetry Event Action

GitHub Action that stores structured observability events by appending records to the session file prepared by the [`setup-telemetry` action](../setup-telemetry/README.md). Each invocation can store telemetry events or span markers in the format expected by [NDJSON](https://github.com/ndjson/ndjson-spec), making it easy to correlate workflow steps in the downstream telemetry pipeline.

Use this action alongside the [`setup-telemetry`](../setup-telemetry/README.md) post-processor, which safely streams to Azure Application Insights the NDJSON lines appended by each invocation.

## Prerequisite

Must be invoked after [`setup-telemetry`](../setup-telemetry/README.md) has exported `OTEL_EVENT_FILE`. If `OTEL_EVENT_FILE` is missing the action fails.

## Usage Examples

### Log a simple event

```yaml
- name: Setup Telemetry Session
  uses: pagopa/dx/actions/setup-telemetry@VERSION
  with:
    connection_string: ${{ secrets.APPI_CONNECTION_STRING }}

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
    name: build
    phase: start

# ... build steps ...

- name: End build span
  uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with:
    name: build
    phase: end
```

It is also possible to interleaving multiple spans:

```yaml
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { name: compile, phase: start }

- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { name: test, phase: start }
# ...
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { name: compile, phase: end }
- uses: pagopa/dx/actions/log-telemetry-event@<ref>
  with: { name: test, phase: end }
```

## Inputs

| Name           | Required | Description                                                             |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `name`         | yes      | Logical event name (for custom events or exception label)               |
| `body`         | no       | Textual message/value (shown as body)                                   |
| `is_exception` | no       | `true` marks this event as an exception (span status will be set ERROR) |
| `phase`        | no       | `start` or `end` to delimit a child span                                |

Rules:

- If `name` and `phase` are both set, a span marker line is written instead of an event line.
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

## Error Handling

- Malformed JSON lines: skipped by consumer.
- Unknown `span_phase`: falls back to writing a regular event line.
- Missing `OTEL_EVENT_FILE`: action fails early.
