# pnpm-plugin-pagopa

Default configuration for PagoPA DX projects using [pnpm](https://pnpm.io).

## Installation

```sh
pnpm add --config pnpm-plugin-pagopa
```

This will add `pnpm-plugin-pagopa` to the [configDependencies](https://pnpm.io/config-dependencies) field in your `pnpm-workspace.yaml`, including also the `pnpmfile.cjs` with the hooks needed to use this plugin.

## What is included

This configuration package provides the following default settings for your `pnpm-workspace.yaml`.

- Sets [workspacePackagePatterns](https://pnpm.io/workspaces) to `["apps/*", "packages/*"]`
- Sets [linkWorkspacePackages](https://pnpm.io/cli/run#linkworkspacepackages) to `true`
- Sets [packageImportMethod](https://pnpm.io/settings#packageimportmethod) to `clone-or-copy`
- Sets [cleanupUnusedCatalogs](https://pnpm.io/catalogs#cleanupunusedcatalogs) to `true`


