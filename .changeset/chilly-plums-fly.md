---
"pnpm-plugin-pagopa": patch
---

Set `cleanupUnusedCatalogs` option to `true` by default

In this way, when the `pnpm-plugin-pagopa` is added to the `configDependencies`, any other catalog that is not used in the project will be removed, keeping the `pnpm-lock.yaml` clean and avoiding potential conflicts with other catalogs.
