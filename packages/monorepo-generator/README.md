# @pagopa/monorepo-generator

A package that generates a monorepo scaffold following PagoPA DX conventions.

## Overview

The `@pagopa/monorepo-generator` provides a plop-based generator and templates to bootstrap a new monorepo with the repository layout, configuration and files used across the DX initiative.

> Work in progress — expect improvements to templates and prompts.

## Recommended usage

Install the dependencies:

```shell
pnpm install
```

Compile everything:

```shell
pnpm build
```

Run the generator, referencing the `plopfile.js` file:

```shell
pnpm plop --plopfile ./dist/plopfile.js
```
