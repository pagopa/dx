# @pagopa/eslint-config

This package provides PagoPA's `eslint.config.js` as an extensible shared config.

## Usage

> [!IMPORTANT]  
> This config requires `eslint >= 9.0`, so it uses flat config files. Learn more about ESLint 9 and flat config files in the [official documentation](https://eslint.org/docs/latest/use/configure/configuration-files).

1. Install `eslint` and `@pagopa/eslint-config`

   ```shell
   yarn add -D eslint @pagopa/eslint-config
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
     ...,
     "scripts": {
       "lint": "eslint --fix",
       "lint:check": "eslint"
     }
   }
   ```
