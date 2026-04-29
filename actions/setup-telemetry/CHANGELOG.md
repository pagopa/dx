## 0.1.9 (2026-04-28)

### 🧱 Updated Dependencies

- Updated @pagopa/azure-tracing to 0.5.0

## 0.1.8 (2026-04-17)

### 🧱 Updated Dependencies

- Updated @pagopa/azure-tracing to 0.4.18
- Updated @pagopa/eslint-config to 6.0.3

## 0.1.7 (2026-04-08)

### 🩹 Fixes

- Set default value for Application Insights connection string ([#1566](https://github.com/pagopa/dx/pull/1566))

### ❤️ Thank You

- Andrea Grillo
- Copilot @Copilot

## 0.1.6 (2026-04-03)

### 🩹 Fixes

- Upgrade node version to node24 ([#1567](https://github.com/pagopa/dx/pull/1567))

### ❤️ Thank You

- Andrea Grillo
- Copilot @Copilot
- Marco Comi

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
