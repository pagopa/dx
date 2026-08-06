/**
 * Ambient module declaration for `import-in-the-middle/register-hooks.mjs`.
 *
 * The package ships `register-hooks.d.ts`, not `.d.mts`, so TS's node16/nodenext
 * resolution can't match it to the `.mjs` file. Re-exporting from the real
 * declaration keeps this in sync with upstream instead of hand-copying types.
 */

declare module "import-in-the-middle/register-hooks.mjs" {
  export * from "import-in-the-middle/register-hooks.d.ts";
}
