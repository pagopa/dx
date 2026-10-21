# @pagopa/nx-dx

Nx plugin for PagoPA DX workspaces.

## Workflow synchronization

This repository registers `@pagopa/nx-dx:workflows` in
`sync.globalGenerators` in `nx.json`. Run `pnpm nx sync` to regenerate the
deployment workflow, including the deployable application choices.
The generated workflow is named `_deploy.yaml`. Synchronization overwrites the
workflow from the template.

## Nx Release for `project.json` projects

Projects without a package manifest can store their release version in
`project.json` under `metadata.version` and use the `@pagopa/nx-dx` version
actions:

```json
{
  "metadata": {
    "version": "1.2.3"
  },
  "release": {
    "version": {
      "currentVersionResolver": "disk",
      "versionActions": "@pagopa/nx-dx/release/version-actions"
    }
  }
}
```

The version actions read and update only `project.json`; projects using other
manifest formats are unaffected.

## Building

Run `pnpm nx build @pagopa/nx-dx` to build the plugin.

## Running unit tests

Run `pnpm nx test @pagopa/nx-dx` to execute the unit tests via [Vitest](https://vitest.dev/).
