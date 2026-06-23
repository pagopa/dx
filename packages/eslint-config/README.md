# @pagopa/eslint-config

This package provides PagoPA's `eslint.config.js` as an extensible shared config.

It supports both **ESLint 9** and **ESLint 10**.

## Usage

1. Install `@pagopa/eslint-config` together with its peer dependencies.

   The required peers are `eslint`, `@eslint/js` (matching the same major as `eslint`), and `prettier`.

   For ESLint 10:

   ```shell
   pnpm add -D eslint@^10 @eslint/js@^10 @pagopa/eslint-config
   pnpm add -D -E prettier
   ```

   For ESLint 9 (e.g. React Native apps):

   ```shell
   pnpm add -D eslint@^9 @eslint/js@^9 @pagopa/eslint-config
   pnpm add -D -E prettier
   ```

2. Create a file names `eslint.config.js` at the root of your workspace with the following content

   > [!TIP]  
   > If your workspace uses CommonJS, name this file `eslint.config.mjs`

   ```js
   import pagopa from "@pagopa/eslint-config";

   export default [...pagopa];
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

The default entry point ships rules for [Vitest](https://vitest.dev/). A separate
`@pagopa/eslint-config/jest` subpath provides the equivalent rules for
[Jest](https://jestjs.io/), which is the default test runner for React Native apps.

### Jest (React Native)

Install `eslint-plugin-jest` alongside the regular peer dependencies:

```shell
pnpm add -D eslint-plugin-jest
```

Then import the `/jest` subpath:

```js
import pagopa from "@pagopa/eslint-config/jest";

export default [...pagopa];
```

> [!NOTE]
> React Native apps should compose this configuration with
> [`@react-native/eslint-config`](https://www.npmjs.com/package/@react-native/eslint-config),
> which contributes the React, React Hooks and React Native rule sets that this package
> intentionally leaves out.
