## 0.0.4 (2026-11-20)

### 🩹 Fixes

- Prefer tsrs in the type-aware rules note ([#2563](https://github.com/pagopa/dx/pull/2563))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.3 (2026-11-18)

### 🩹 Fixes

- Recognise the test blocks created with `test.extend()`: oxlint does not follow the fixtures a test object is extended from, so every `expect` inside an extended block was reported as standalone. Both flavours now pass `additionalTestBlockFunctions: ["it", "test"]` to `no-standalone-expect`, which clears the false positives and still flags an `expect` sitting outside a test block. The maintainer notes document the exemptions and the coverage holes the migration left open. ([#2560](https://github.com/pagopa/dx/pull/2560))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.2 (2026-11-18)

### 🚀 Features

- Add `base-jest.json`, a Jest flavour of the configuration for projects that cannot use Vitest: it mirrors the Vitest overlay rule for rule with oxlint's built-in `jest/*` rules, keeping the same severity, the same options and the same test file patterns. `no-import-node-test`, `prefer-called-exactly-once-with` and `require-local-test-context-for-concurrent-snapshots` have no Jest counterpart and are omitted. The rules shared by both flavours now live in `core.json`, which the two variants extend, so `base.json` keeps behaving exactly as before. ([#2555](https://github.com/pagopa/dx/pull/2555))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.1 (2026-11-17)

### 🚀 Features

- Add `@pagopa/oxlint-config`, a native [oxlint](https://oxc.rs/docs/guide/usage/linter) configuration for PagoPA projects. ([#2547](https://github.com/pagopa/dx/pull/2547))

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

### ❤️ Thank You

- Danilo Spinelli @gunzip