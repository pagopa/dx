---
"@pagopa/eslint-config": major
---

Added support for ESLint 10.x.

### Migration notes

- You must upgrade to ESLint 10.x, to use this new version of the configuration
- This configuration now requires `prettier >= 3.0.0` as a peer dependency
- `@eslint/js`, `@vitest/eslint-plugin`, and `typescript-eslint` now includes new reccommended rules, so you may need to adjust your code to comply with the new rules.
