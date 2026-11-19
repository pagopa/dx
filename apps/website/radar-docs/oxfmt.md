---
title: "Oxfmt"
ring: adopt
tags: [typescript, dx, tool]
---

[Oxfmt](https://oxc.rs/docs/guide/usage/formatter) is a high-performance,
Prettier-compatible formatter from the [Oxc](https://oxc.rs/) compiler stack. It
targets large codebases and CI environments, with throughput that is
substantially higher than Prettier while matching Prettier's JavaScript and
TypeScript formatting.

Replacing Prettier in scripts takes little change, and Oxfmt ships built-in
sorting options for imports, Tailwind CSS classes, and `package.json` fields
that usually require extra Prettier plugins. Two caveats before swapping the
binary: Oxfmt does not read `.prettierrc`, so migrate the configuration once
with `oxfmt --migrate=prettier`, and the sorting options stay off until you
enable them. See [migrating from
Prettier](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier) and
[the formatter reference](https://oxc.rs/docs/guide/usage/formatter) instead of
re-deriving the options here.

We are adopting Oxfmt as the formatter for JavaScript and TypeScript. New
projects format with Oxfmt, and existing projects replace `prettier --write`
with `oxfmt` and `prettier --check` with `oxfmt --check` in local scripts,
pre-commit hooks, editors, and CI. There is no grace period:
[Prettier](./prettier.md) moved to `hold` and repositories migrate as they go.

## Use cases

- Format JavaScript and TypeScript in local and CI workflows
- Check formatting without writing files, with `oxfmt --check`
- Replace Prettier plus its import-sorting, Tailwind CSS, and `package.json`
  plugins with a single tool
- Migrate an existing Prettier configuration with `oxfmt --migrate=prettier`

## Related radar entries

- [Prettier](./prettier.md) — formatter being replaced; now in hold
- [Oxlint](./oxlint.md) — companion Oxc linter, now in `adopt`

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+oxfmt&type=pullrequests
