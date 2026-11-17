# @pagopa/oxlint-config

PagoPA's lint rules, expressed as a native [oxlint](https://oxc.rs/docs/guide/usage/linter) configuration.

It mirrors the rule set of [`@pagopa/eslint-config`](../eslint-config) so a
workspace can run oxlint and get the same findings, roughly 3× faster than
ESLint. It is a drop-in replacement for linting, not a replacement for every
ESLint feature: see [Limitations](#limitations).

## Installation

The package is published on GitHub Packages, so make sure your `.npmrc` points
the `@pagopa` scope to the right registry (see the
[DX documentation](https://dx.pagopa.it/docs/)).

```shell
pnpm add -D oxlint @pagopa/oxlint-config
```

`oxlint` is a peer dependency: the configuration relies on the rule set and the
JS plugin support of oxlint `>= 1.93.0 < 2`.

## Usage

Create an `.oxlintrc.json` file at the root of your workspace:

```json
{
  "extends": ["./node_modules/@pagopa/oxlint-config/base.json"],
  "ignorePatterns": ["**/generated/*", "**/dist/**", "**/bin/**"]
}
```

`ignorePatterns` repeats the global ignores of `@pagopa/eslint-config`. oxlint
resolves each pattern against the directory of the configuration file that
declares it, so the identical list inside `base.json` is relative to the
installed package and never matches your files: keep the line in your own
`.oxlintrc.json`, or `oxlint --fix` will rewrite generated code and build
output. The copy in `base.json` only documents the values the tests compare
against `@pagopa/eslint-config`.

> [!IMPORTANT]  
> oxlint only accepts **file paths** in `extends`, not package specifiers, so
> `"@pagopa/oxlint-config"` is rejected with
> `Unsupported named config ... in extends`. Use the path form above. If your
> package manager does not hoist dependencies to the workspace root, point the
> path to where `@pagopa/oxlint-config` is actually installed.

Then replace your `lint` scripts:

```json
{
  "scripts": {
    "lint": "oxlint --fix",
    "lint:check": "oxlint"
  }
}
```

The package ships a single `base.json` file. It is strict JSON, so any tool can
parse it, and oxlint loads it as-is.

### Plugins

`eslint-plugin-perfectionist` is a regular dependency of this package and is
loaded through oxlint's `jsPlugins`, with the specifier resolved relative to
`base.json` itself. You do not need to install it, and you do not need to add
anything to your own configuration.

## Rule coverage

| View                                             | Rules provided | Rules enabled by `@pagopa/eslint-config` |
| ------------------------------------------------ | -------------- | ---------------------------------------- |
| Script files (`*.js`)                            | 134            | 138                                      |
| Source files (`*.ts`, `*.tsx`)                   | 120            | 122                                      |
| Test files (`*.test.ts`, `*.spec.ts`, `test/**`) | 141            | 143                                      |

`@pagopa/eslint-config` lints JavaScript and TypeScript differently, and so
does `base.json`: rules that TypeScript already enforces (`no-const-assign`,
`no-unreachable`, ...) are enabled for scripts and turned off for `*.ts` files,
where `prefer-rest-params` and `prefer-spread` only make sense. The overrides
are scoped so that neither set leaks into the other.

All 22 `perfectionist/*` rules are enabled through `jsPlugins`, and 20 of them
were verified to report the same findings, in the same place, as their ESLint
counterparts; `sort-export-attributes` and `sort-import-attributes` need syntax
the fixtures do not cover.

The rules that cannot be ported are:

- `no-dupe-args`, `no-octal`, `no-undef-init` —
  [not implemented](https://oxc.rs/docs/guide/usage/linter/rules) by oxlint.
- `no-undef` — implemented by oxlint, but only in its `nursery` category, which
  this config leaves disabled. It only applies to JavaScript files, where
  TypeScript users rarely lint.

This list is kept in sync by the test suite: if oxlint gains support for one of
these rules, the tests fail and tell you to enable it.

### Option-level divergences

The rules are enabled with the same options as in `@pagopa/eslint-config`, with
these exceptions:

- `arrow-body-style`: oxlint only exposes `as-needed`, which is the behaviour
  `@pagopa/eslint-config` asks for, so reports match.
- `radix`: `@pagopa/eslint-config` relies on the rule default (`always`), which
  oxlint requires explicitly; behaviour is identical.
- `@typescript-eslint/no-unused-vars`: oxlint leaves values consumed only by a
  type (`const id = 1; export type Id = typeof id;`) unreported unless
  `reportVarsOnlyUsedAsTypes` is set. ESLint always reports them, so `base.json`
  pins the option for TypeScript files. It is the only option in the config that
  ESLint does not declare.
- `@typescript-eslint/consistent-type-definitions` and
  `@typescript-eslint/no-extraneous-class`: rules and lines match, but oxlint
  reports a different column. Tooling that deduplicates findings by exact
  position will see them as distinct.

## Limitations

- **Type-aware rules are not included.** They require `oxlint-tsgolint`, which
  needs a TypeScript version newer than the one used by DX today. The rules that
  depend on type information are therefore linted by ESLint only.
- **Vitest only.** The configuration ships the Vitest overlay, like the default
  entry point of `@pagopa/eslint-config`; there is no Jest flavour yet.
- **No config inheritance for editors.** oxlint integrations that do not read
  `.oxlintrc.json` from the workspace root will not pick up these rules.

## Performance

Benchmarked on 500 generated TypeScript files (1,500 findings with both linters,
so the comparison is like for like), warm cache, median of 5 runs, macOS on
Apple silicon:

| Linter | Time   |
| ------ | ------ |
| oxlint | 0.35 s |
| ESLint | 1.02 s |

That is a ~2.9× speedup with an identical finding count. Real projects see a
smaller ratio as fixed startup costs dominate on small file sets, but the
relative gap grows with workspace size.

To reproduce, generate a directory of files and run both linters against it:

```shell
pnpm exec oxlint -c node_modules/@pagopa/oxlint-config/base.json src
pnpm exec eslint src
```

## How this package is verified

The rule mapping is locked by tests in `src/__tests__`:

- `parity.test.ts` compares the oxlint rule set with the one
  `@pagopa/eslint-config` computes with the ESLint API, in **both directions**:
  every ESLint rule must be covered (except the documented gaps) and oxlint must
  not enable anything ESLint does not. It also compares the options of every
  rule `base.json` pins, so a threshold or ordering change on the ESLint side
  fails here too.
- `config.test.ts` checks the shape of `base.json`: every rule exists in the
  oxlint schema or in the perfectionist plugin, plugin prefixes are declared,
  no category is left enabled, and the test-file overlay mirrors the
  `@pagopa/eslint-config` overlay.
- `fixture.test.ts` runs both linters on the same sources and requires the same
  rules on the same lines, plus the same columns for perfectionist rules. The
  sources cover scripts, TypeScript, TSX and the Vitest overlay, so relaxations
  such as `no-empty-function` being off in test files are checked on output, not
  only in the configuration.

Run them with:

```shell
pnpm nx test @pagopa/oxlint-config
```

## Keeping it in sync

When `@pagopa/eslint-config` changes, the tests in this package fail on the
newly added or removed rules. Regenerate `base.json` accordingly: the fast path
is to read the failures, since they name the exact rules to add or remove, and
then run `pnpm nx test @pagopa/oxlint-config` again.
