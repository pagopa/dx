# @pagopa/monorepo-generator

A package that generates a monorepo scaffold following PagoPA DX conventions.

## Overview

The `@pagopa/monorepo-generator` provides a plop-based generator and templates to bootstrap a new monorepo with the repository layout, configuration and files used across the DX initiative.

> Work in progress — expect improvements to templates and prompts.

## Recommended usage (from repository root)

Run the package script from the monorepo root so workspace dependencies and filtered scripts are resolved:

```sh
# run the package script which builds and runs plop
pnpm --filter @pagopa/monorepo-generator run generate
```
