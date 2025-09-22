# pnpm-plugin-pagopa

## 0.1.1

### Patch Changes

- cebfb8d: Set `cleanupUnusedCatalogs` option to `true` by default

  In this way, when the `pnpm-plugin-pagopa` is added to the `configDependencies`, any other catalog that is not used in the project will be removed, keeping the `pnpm-lock.yaml` clean and avoiding potential conflicts with other catalogs.

## 0.1.0

### Minor Changes

- 3ea69ed: Add `pnpm-plugin-pagopa` with basic configuration
