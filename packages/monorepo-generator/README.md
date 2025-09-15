# @pagopa/monorepo-generator

A package that generates a monorepo scaffold following PagoPA DX conventions.

## Overview

The `@pagopa/monorepo-generator` provides a plop-based generator and templates to bootstrap a new monorepo with the repository layout, configuration and files used across the DX initiative.

> Work in progress — expect improvements to templates and prompts.

## Recommended usage

This package exports the generator function. To use it, you can create your own plopfile (`plopfile.js`) and register the generator.

1) Install plop and the generator package in the consumer repository (plop must be provided by the consumer):

```sh
pnpm add -D plop
pnpm add @pagopa/monorepo-generator
```

2) Example repository-level plopfile (JavaScript)

Create a top-level plopfile.js in your repo:

```js
// plopfile.js
const scaffoldMonorepo = require('@pagopa/monorepo-generator');

module.exports = function (plop) {
  // register the generator exported by the package
  scaffoldMonorepo(plop);
};
```

Or TypeScript plopfile (plopfile.ts)

```ts
import scaffoldMonorepo from '@pagopa/monorepo-generator';

export default function (plop) {
  scaffoldMonorepo(plop);
}
```

3) Run plop from your repository root to use the registered generator:

```sh
pnpm plop
```

Select the "monorepo" generator and follow prompts.

> [!NOTE]
> This package declares `plop` as a peer dependency, so you will have to install plop in your project.
