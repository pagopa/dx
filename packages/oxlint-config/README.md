# @pagopa/oxlint-config

PagoPA's lint rules, expressed as a native
[oxlint](https://oxc.rs/docs/guide/usage/linter) configuration.

This package is the source of truth for linting in PagoPA projects, and it
lints a workspace roughly 3× faster than ESLint. It supersedes
[`@pagopa/eslint-config`](../eslint-config), which is frozen: see
[migrating from ESLint](#migrating-from-eslint).

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

`ignorePatterns` in your own file keeps `oxlint --fix` from rewriting
generated code and build output. oxlint resolves each pattern against the
directory of the configuration file that declares it, so the list inside
`base.json` is relative to the installed package and never matches your files:
the line in your `.oxlintrc.json` is the one that counts.

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

## Migrating from ESLint

`@pagopa/eslint-config` is frozen: it keeps working, but it will not receive new
rules or fixes. To move a workspace over:

1. `pnpm remove @pagopa/eslint-config eslint` — keep ESLint if you still need
   the [type-aware rules](#limitations).
2. `pnpm add -D oxlint @pagopa/oxlint-config` and add the `.oxlintrc.json`
   shown above.
3. Point the `lint` scripts at `oxlint` and delete `eslint.config.js`.
4. Review the first run: the handful of rules oxlint cannot express are listed
   under [rule coverage](#rule-coverage), and formatting is unchanged.

## Rule coverage

`base.json` enables 134 core oxlint rules, plus all 22 `perfectionist/*` rules
through `jsPlugins`, plus the 22 `vitest/*` rules on test files (`*.test.*`,
`*.spec.*`, `test/**`).

JavaScript and TypeScript are linted differently: rules that TypeScript already
enforces (`no-const-assign`, `no-unreachable`, ...) are enabled for scripts and
turned off for `*.ts` files, where `prefer-rest-params` and `prefer-spread` only
make sense. The overrides are scoped so that neither set leaks into the other.

Four rules from the ESLint era have no counterpart here:

- `no-dupe-args`, `no-octal`, `no-undef-init` —
  [not implemented](https://oxc.rs/docs/guide/usage/linter/rules) by oxlint.
- `no-undef` — implemented by oxlint, but only in its `nursery` category, which
  this config leaves disabled. It only applies to JavaScript files, where
  TypeScript users rarely lint.

### Pinned options

A few options are pinned instead of relying on defaults:

- `no-unused-vars` sets `reportVarsOnlyUsedAsTypes` for TypeScript files, so a
  value consumed only by a type (`const id = 1; export type Id = typeof id;`)
  is reported.
- `arrow-body-style` uses `as-needed`, the only style oxlint exposes.
- `radix` sets `always` explicitly, because oxlint requires the mode.

## Limitations

- **Type-aware rules are not included.** They require `oxlint-tsgolint`, which
  needs a TypeScript version newer than the one used by DX today. Projects that
  need them keep a minimal ESLint setup next to oxlint.
- **Vitest only.** The configuration ships the Vitest overlay; there is no Jest
  flavour yet.
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

The test suite in `src/__tests__` validates the shape of `base.json` against
oxlint's own schema, so it fails on a typo, a rule that oxlint does not ship, a
missing plugin registration, or a category left enabled:

- every rule id exists in oxlint's `configuration_schema.json` or in the
  perfectionist plugin;
- every plugin prefix used by a rule is declared in `plugins` or `jsPlugins`,
  and no declared plugin is unused;
- the seven oxlint categories are all `off`, so coverage is explicit;
- TypeScript files turn off the checks the compiler already reports and enable
  the two script-only ones.

Run them with:

```shell
pnpm nx test @pagopa/oxlint-config
```

## Making changes

`base.json` is the source of truth: nothing else has to be regenerated when a
rule is added, removed or retuned. Update the file, run the tests, and add a
version plan so consumers see the change in the changelog.

When oxlint gains a rule that is missing here, or moves `no-undef` out of
`nursery`, add it and drop it from the list in [rule coverage](#rule-coverage).
