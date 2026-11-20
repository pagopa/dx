---
title: "Prettier"
ring: hold
tags: [typescript, dx, tool]
---

While [Prettier](https://prettier.io/) has been the reference opinionated code
formatter for years, we no longer recommend it for new projects and we are
migrating existing ones.

## Reasons:

1. **Superseded:** [Oxfmt](./oxfmt.md) is our `adopt` formatter, with no grace
   period.

2. **Slower, and needs plugins:** Oxfmt is built on [Oxc](https://oxc.rs/) and
   sorts imports, Tailwind CSS classes, and `package.json` fields natively,
   where Prettier is slower and needs a plugin per concern.

3. **Migration is small:** Oxfmt is Prettier-compatible, so the
   `prettier --write` and `prettier --check` commands become `oxfmt` and
   `oxfmt --check`. The config still needs migrating, because Oxfmt does not
   read `.prettierrc`: see the [Oxfmt entry](./oxfmt.md).

## Reference of usage in our organization

Prettier is still found in several TypeScript projects while they migrate:

https://github.com/search?q=org%3Apagopa+%22\%22prettier\%22%22+path%3A**%2Fpackage.json&type=code
