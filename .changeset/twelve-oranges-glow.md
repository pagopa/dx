---
"@pagopa/monorepo-generator": patch
---

Refactored the pnpm setup action: renamed the function to `setupMonorepoWithPnpm` to better reflect its purpose, as it uses pnpm to bootstrap the monorepo tooling (plugins, turbo, changesets, devcontainer, etc.), not just configure pnpm itself.

Additionally, addressed an issue where the action did not work as expected due to the previous removal of the `repoSrc` key. The function signature and logic were updated to align with the current structure, ensuring correct monorepo initialization.

With these changes, the scaffolder now properly generates all pnpm-related configuration and setup, ensuring a working monorepo environment out of the box.
