/**
 * Ambient module declaration for `import-in-the-middle/register-hooks.mjs`.
 *
 * The package ships `register-hooks.d.ts` (not `.d.mts`), which TypeScript's
 * `node16`/`nodenext` module resolution does not associate with the `.mjs`
 * implementation file, so the subpath import would otherwise be untyped.
 */
declare module "import-in-the-middle/register-hooks.mjs" {
  export type RegisterHooksOptions = {
    exclude?: (RegExp | string)[];
    include?: (RegExp | string)[];
  };

  export function register(options?: RegisterHooksOptions): void;
  export function supportsSyncHooks(): boolean;
}
