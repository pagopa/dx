# Install Setup Telemetry

## 0.1.5

### Patch Changes

- 37cb5e9: Upgrade OpenTelemetry dependencies
- Updated dependencies [37cb5e9]
  - @pagopa/azure-tracing@0.4.14

## 0.1.4

### Patch Changes

- d634c90: Remove the `@azure/monitor-opentelemetry` and add `@pagopa/azure-tracing` dependency.

  By doing this, every time we update the internal `@pagopa/azure-tracing` package, we are propagating the
  changes to the `setup-telemetry` action as well.

## 0.1.3

### Patch Changes

- 66b392d: Update to support the newest version of @pagopa/eslint-config (eslint10, new rules)

## 0.1.2

### Patch Changes

- e0a3767: Upgrade dependencies

## 0.1.1

### Patch Changes

- 2d3d8fb: Update tsconfig base

## 0.1.0

### Minor Changes

- fd58eec: Initial action release
