# Setup Telemetry Action

Initializes a telemetry session by creating a local events file and exporting environment variables:

- `OTEL_EVENT_FILE` path to append events
- `OTEL_SESSION_START` timestamp for duration calculation

In the post step it replays all queued events and logs a final custom attribute `otel.workflow.duration_ms`.
