# pnpm-plugin-pagopa

Default configuration for PagoPA DX projects using [pnpm](https://pnpm.io).

## Installation

```sh
pnpm add --config pnpm-plugin-pagopa
```

This will add `pnpm-plugin-pagopa` to the [configDependencies](https://pnpm.io/config-dependencies) field in your `pnpm-workspace.yaml`, including also the `pnpmfile.cjs` with the hooks needed to use this plugin.

## What is included

This configuration package provides the following default settings for your `pnpm-workspace.yaml`.

- Sets [workspacePackagePatterns](https://pnpm.io/workspaces) to `["apps/*", "packages/*"]`.
- Sets [linkWorkspacePackages](https://pnpm.io/cli/run#linkworkspacepackages) to `true`.
- Sets [packageImportMethod](https://pnpm.io/settings#packageimportmethod) to `clone-or-copy`
- Adds `dx` [catalog](https://pnpm.io/catalogs) which includes recommended version of the packages supported by the PagoPA DX toolchain. Here you can find the full [list of packages included](https://github.com/pagopa/dx/blob/main/packages/pnpm-plugin-pagopa/pnpmfile.cjs).

## Use the PagoPA DX catalog

To use the PagoPA DX catalog, you can specify the `catalog:dx` version for supported packages in your `package.json`. This will ensure that you are using the recommended versions of packages that are compatible with the PagoPA DX toolchain.

```jsonc
{
  // .....
  "devDependencies": {
    "eslint": "catalog:dx",
    "vitest": "catalog:dx",
  },
}
```
