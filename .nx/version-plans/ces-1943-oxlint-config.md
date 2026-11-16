---
"@pagopa/oxlint-config": minor
---

Add `@pagopa/oxlint-config`, a native [oxlint](https://oxc.rs/docs/guide/usage/linter) port of `@pagopa/eslint-config`.

The package ships a single `base.json` artifact that reproduces the PagoPA rule set: 141 of the 143 rules enabled by `@pagopa/eslint-config` on test files (120 of 122 on source files), with `no-octal` and `no-undef-init` as the only gaps, because oxlint does not implement them. All 22 `perfectionist/*` rules are loaded through `jsPlugins`, and 20 of them were verified to report the same findings as their ESLint counterparts (`sort-export-attributes` and `sort-import-attributes` need syntax the fixtures do not cover).

Because oxlint only accepts file paths in `extends`, consumers point their configuration at the installed artifact. oxlint resolves `ignorePatterns` against the directory of the configuration file that declares them, so the global ignores of `@pagopa/eslint-config` have to be repeated by the consumer rather than inherited:

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

The rule mapping is enforced by tests that compare the oxlint configuration with the rule set ESLint computes from `@pagopa/eslint-config` in both directions, options included, so a change to the ESLint config fails this package's test suite until the oxlint config is updated. On a 500-file benchmark both linters report the same 1,500 findings and oxlint completes in 0.35s against ESLint's 1.02s.

Type-aware rules are out of scope: they need `oxlint-tsgolint` and a TypeScript version newer than the one this monorepo uses. The package ships the Vitest overlay only, matching the default entry point of `@pagopa/eslint-config`.
