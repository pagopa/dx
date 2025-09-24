---
"@pagopa/monorepo-generator": patch
---

Now, when `turbo` runs the `typecheck` task, it checks if it needs to build a package first.

This is necessary when there is a workspace that depends on another workspace that needs to be built (e.g. a package with source code in `src` that needs to be compiled to `dist`).
