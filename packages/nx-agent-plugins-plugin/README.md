# @pagopa/nx-agent-plugins

Nx integration for [Agent Plugins](https://agent-plugins.org/), discovering
`plugin.json` manifests and integrating their version fields with Nx Release.

## Project inference

The plugin discovers valid `plugin.json` files throughout the workspace. Each
manifest creates an Nx library project named after its `name` field. Projects
are configured to read and update the manifest's top-level `version` field
during release.

## Building

Run `pnpm nx build @pagopa/nx-agent-plugins` to build the plugin.

## Running unit tests

Run `pnpm nx test @pagopa/nx-agent-plugins` to execute the unit tests via
[Vitest](https://vitest.dev/).
