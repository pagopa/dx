# @pagopa/eslint-config

This package provides PagoPA's `eslint.config.js` as an extensible shared config.

It supports both **ESLint 9** and **ESLint 10**.

## Usage

1. Install `@pagopa/eslint-config` together with its peer dependencies.

   The required peers are `eslint`, `@eslint/js` (matching the same major as `eslint`)

   For ESLint 10:

   ```shell
   pnpm add -D eslint@^10 @eslint/js@^10 @pagopa/eslint-config
   ```

   For ESLint 9:

   ```shell
   pnpm add -D eslint@^9 @eslint/js@^9 @pagopa/eslint-config
   ```

2. Create a file names `eslint.config.js` at the root of your workspace with the following content

   > [!TIP]  
   > If your workspace uses CommonJS, name this file `eslint.config.mjs`

   ```js
   import pagopa from "@pagopa/eslint-config";

   export default pagopa;
   ```

3. Add `lint` and `lint:check` scripts in your `package.json`

   ```json
   {
     "scripts": {
       "lint": "eslint --fix src",
       "lint:check": "eslint src"
     }
   }
   ```

## Test-runner support

The config requires one of the following test-runner plugins to be installed:

- [Vitest](https://vitest.dev/): `@vitest/eslint-plugin`
- [Jest](https://jestjs.io/): `eslint-plugin-jest`

If both plugins are installed, the config loads Vitest rules with precedence.

## Migration guide

### From versions with the `/jest` subpath

The `/jest` subpath is no longer required. Import the main package entry point
for both Vitest and Jest configurations:

```js
import pagopa from "@pagopa/eslint-config";

export default pagopa;
```

Install the plugin for the test runner used by your repository. If both plugins
are installed, Vitest rules are selected.

### Peer dependencies

`@vitest/eslint-plugin` is now an optional peer dependency, alongside
`eslint-plugin-jest`. Install at least one of them in the repository that
consumes `@pagopa/eslint-config`:

```shell
pnpm add -D @vitest/eslint-plugin
```

or:

```shell
pnpm add -D eslint-plugin-jest
```

### Formatting

Formatting is no longer run or configured by `@pagopa/eslint-config`. Add a
format task to your repository and configure the formatter independently. For
example, with [Prettier](https://prettier.io/):

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```
