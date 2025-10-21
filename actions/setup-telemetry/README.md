# Setup Telemetry Action

Sets up OpenTelemetry instrumentation for a workflow run, queues events locally (NDJSON), then flushes them to Azure Application Insights in the post phase, creating:

- A root workflow span
- Custom events
- Exceptions (on the root span)
- Child spans reconstructed from markers

## Lifecycle

1. Main step: creates a session file & exports environment variables.
2. Other steps call `log-telemetry-event` to append events / span markers.
3. Post step: replays NDJSON lines, builds spans/events, sets workflow result, flushes.

## Exported Environment Variables (Producer Contract)

| Variable                                | Purpose                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `OTEL_EVENT_FILE`                       | Absolute path to NDJSON file for queued lines                                 |
| `OTEL_SESSION_START`                    | ISO/start timestamp (ms epoch) used for root span start & duration derivation |
| `OTEL_CORRELATION_ID`                   | Correlation id (trace continuity fallback)                                    |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Connection string used by Azure Monitor exporter                              |

## Consumed Optional Environment Variables (Enhance Root Span Attributes)

Set these before the post phase (e.g. via other composite actions):

| Variable               | Added OTel Attribute     | Meaning                                                                                             |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `PIPELINE_RESULT`      | `cicd.pipeline.result`   | Final pipeline outcome; if missing defaults to `success`, may switch to `error` if exceptions occur |
| `NODE_PACKAGE_MANAGER` | `node.package_manager`   | Detected Node package manager (npm/yarn/pnpm)                                                       |
| `TERRAFORM_VERSION`    | `terraform.version`      | Terraform version used during run                                                                   |
| `CSP_LIST`             | `cloud_provider.enabled` | Comma separated list of cloud providers involved                                                    |

Source actions currently exporting these:

- `.github/actions/node-setup` -> `NODE_PACKAGE_MANAGER`
- `.github/actions/terraform-setup` -> `TERRAFORM_VERSION`

(Add a custom step for `PIPELINE_RESULT` or feature detection for `CSP_LIST`.)

## Root Span Attributes

| Attribute                    | Source                                     |
| ---------------------------- | ------------------------------------------ |
| `cicd.pipeline.action.name`  | `GITHUB_WORKFLOW`                          |
| `cicd.pipeline.run.id`       | `GITHUB_RUN_ID`                            |
| `cicd.pipeline.attempt`      | `GITHUB_RUN_ATTEMPT`                       |
| `cicd.pipeline.trigger`      | `GITHUB_EVENT_NAME`                        |
| `cicd.pipeline.repository`   | `GITHUB_REPOSITORY`                        |
| `cicd.pipeline.run.url.full` | Derived from server/repo/run id            |
| `cicd.pipeline.author`       | `GITHUB_ACTOR`                             |
| `cicd.pipeline.result`       | `PIPELINE_RESULT` or adjusted on exception |
| `cdcd.pipeline.path`         | `GITHUB_ACTION_PATH`                       |
| `node.package_manager`       | `NODE_PACKAGE_MANAGER`                     |
| `terraform.version`          | `TERRAFORM_VERSION`                        |
| `cloud_provider.enabled`     | `CSP_LIST`                                 |

## NDJSON Consumption

Reads `OTEL_EVENT_FILE` line by line:

### Event / Exception Lines

Format:

```jsonc
{"name":"X","body":"...","exception":false}
{"name":"Y","body":"...","exception":true}
```

Behavior:

- `exception=false`: emits custom event with `microsoft.custom_event.name`.
- `exception=true`: records exception on root span, sets status ERROR, updates `cicd.pipeline.result` to `error` (if not already failing).

### Span Marker Lines

Format:

```jsonc
// start
{"span":"build","startSpan":"2025-10-21T09:30:12.123Z"}
// end
{"span":"build","endSpan":"2025-10-21T09:31:05.987Z"}
```

Reconstruction logic:

- Pairs `startSpan`/`endSpan` in order for the same span name.
- Multiple pairs -> multiple INTERNAL child spans.
- Incomplete or reversed pairs are ignored.

## Designing Child Spans

Use them only for hot paths where duration matters (build, test, deploy step groups). Keep names short and stable (e.g. `compile`, `integration-tests`).

## Pipeline Result Strategy

Currently trusts `PIPELINE_RESULT` if set; otherwise starts as `success` then flips to `error` upon first exception. You can extend by exporting more granular outcomes (`failure`, `cancelled`, `skipped`, `timed_out`) before post.

## Usage Example

```yaml
- name: Setup Telemetry Session
  uses: pagopa/dx/actions/setup-telemetry@VERSION
  with:
    connection_string: ${{ secrets.APPI_CONNECTION_STRING }}

- name: Start build span
  uses: pagopa/dx/actions/log-telemetry-event@VERSION
  with:
    span_name: build
    span_phase: start

- name: Build
  run: pnpm build

- name: End build span
  uses: pagopa/dx/actions/log-telemetry-event@VERSION
  with:
    span_name: build
    span_phase: end

- name: Log result value
  uses: pagopa/dx/actions/log-telemetry-event@VERSION
  with:
    name: ArtifactCount
    body: "42"

- name: Mark failure (optional)
  if: failure()
  run: echo "PIPELINE_RESULT=failure" >> $GITHUB_ENV
```

## Error Handling & Resilience

- Missing file: emits notice and still flushes root span.
- Malformed lines: skipped without aborting.
- Child spans only created for valid pairs to avoid skewed timings.
