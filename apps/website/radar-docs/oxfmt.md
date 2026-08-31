---
title: "Oxfmt"
ring: assess
tags: [typescript, dx, tool]
---

[Oxfmt](https://oxc.rs/docs/guide/usage/formatter) is a high-performance,
Prettier-compatible formatter from the [Oxc](https://oxc.rs/) compiler stack. It
targets large codebases and CI environments, with throughput that is
substantially higher than Prettier while matching Prettier's JavaScript and
TypeScript formatting.

Oxfmt can drop into existing Prettier-based scripts with little change, and it
ships built-in sorting for imports, Tailwind CSS classes, and `package.json`
fields that usually require extra Prettier plugins.

We are assessing Oxfmt as a possible successor to [Prettier](./prettier.md) for
JavaScript and TypeScript formatting. Prettier remains the current adopt choice
until this evaluation is complete.

## Use cases

- Format JavaScript and TypeScript in local and CI workflows
- Check formatting without writing files
- Evaluate a faster, Prettier-compatible alternative in large repositories

## Related radar entries

- [Prettier](./prettier.md) — current adopt formatter
- [Oxlint](./oxlint.md) — companion Oxc linter, also in assess

## Reference of usage in our organization

https://github.com/search?q=org%3Apagopa+oxfmt&type=code
