# @pagopa/eslint-config

This package provides PagoPA's `eslint.config.js` as an extensible shared config.

## Usage

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
     "scripts": {
       "lint": "eslint --fix src",
       "lint:check": "eslint src"
     }
   }
   ```
