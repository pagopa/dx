# pnpm-plugin-pagopa

## 1.0.0

### Major Changes

- 6877f3c: Remove dx catalog functionality due to PNPM catalog implementation bug

  **BREAKING CHANGE**: The plugin no longer provides a dx catalog. Catalog entries have been moved to the default catalog in the repository's pnpm-workspace.yaml file.

  This change was made to address a bug in PNPM's catalog implementation that affects the dx catalog provided by this plugin. Until the upstream bug is fixed, users should reference packages using `catalog:` instead of `catalog:dx`.

  Affected packages moved to default catalog:
  - @pagopa/eslint-config: ^5.0.0
  - @vitest/coverage-v8: ^3.2.4
  - eslint: ^9.30.0
  - vitest: ^3.2.4

## 0.1.1

### Patch Changes

- cebfb8d: Set `cleanupUnusedCatalogs` option to `true` by default

  In this way, when the `pnpm-plugin-pagopa` is added to the `configDependencies`, any other catalog that is not used in the project will be removed, keeping the `pnpm-lock.yaml` clean and avoiding potential conflicts with other catalogs.

## 0.1.0

### Minor Changes

- 3ea69ed: Add `pnpm-plugin-pagopa` with basic configuration
