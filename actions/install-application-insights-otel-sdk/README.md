# Install Application Insights OpenTelemetry SDK Action

Installs Azure Monitor OpenTelemetry Distro and required OpenTelemetry packages.

## Usage

```yaml
your-step:
  uses: ./actions/install-application-insights-otel-sdk
```

Optionally override the Node.js version (defaults to 24 if `actions/setup-node` already ran).

No inputs currently; can be extended to pin specific versions.

## Installed Packages

- @azure/monitor-opentelemetry
- @opentelemetry/api
- @opentelemetry/api-logs
- @opentelemetry/auto-instrumentations-node
- @opentelemetry/sdk-metrics
- @opentelemetry/resources
- @opentelemetry/semantic-conventions
- @opentelemetry/sdk-trace-base

## Future Improvements

- Add input to specify versions
- Cache `node_modules` via actions/cache
- Optional exclusion of auto-instrumentations
