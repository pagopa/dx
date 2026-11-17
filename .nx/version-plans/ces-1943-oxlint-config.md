---
"@pagopa/oxlint-config": minor
---

Add `@pagopa/oxlint-config`, a native [oxlint](https://oxc.rs/docs/guide/usage/linter) configuration for PagoPA projects.

The package ships a single `base.json` artifact that enables 134 core oxlint rules, all 22 `perfectionist/*` rules through `jsPlugins`, and 22 `vitest/*` rules on test files. `@pagopa/eslint-config` is frozen as of this release and `base.json` becomes the source of truth for linting: four rules from the ESLint preset have no counterpart (`no-dupe-args`, `no-octal` and `no-undef-init` are not implemented by oxlint, and `no-undef` only ships in oxlint's disabled `nursery` category). Following ESLint, the rules that TypeScript already enforces are enabled for script files and turned off by a `**/*.ts` override, where `prefer-rest-params` and `prefer-spread` take over.

Because oxlint only accepts file paths in `extends`, consumers point their configuration at the installed artifact. oxlint resolves `ignorePatterns` against the directory of the configuration file that declares them, so the global ignores have to be repeated by the consumer rather than inherited:

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

`base.json` pins `reportVarsOnlyUsedAsTypes` for TypeScript files, without which oxlint accepts a value consumed only by a type alias, and makes `arrow-body-style` and `radix` explicit because oxlint requires the mode. On a 500-file benchmark oxlint reports the same 1,500 findings as the ESLint preset in 0.35s against 1.02s.

Type-aware rules are out of scope: they need `oxlint-tsgolint` and a TypeScript version newer than the one this monorepo uses. The package ships the Vitest overlay only.
