---
"@pagopa/eslint-config": major
---

Migrate to ESLint version 9

### Major Changes
- **ESLint 9 Support**: Added support for ESLint 9.x
- **Official Vitest Plugin**: Replaced `eslint-plugin-vitest@0.5.4` with the official `@vitest/eslint-plugin@^1.3.4` for better ESLint 9 compatibility
- **Updated Dependencies**: Updated all ESLint-related dependencies to their latest versions compatible with ESLint 9
- **Peer Dependencies**: Updated peer dependencies to require ESLint `^9`

### Breaking Changes
- You must upgrade to ESLint 9.x
- The old `eslint-plugin-vitest` package has been replaced with the official `@vitest/eslint-plugin`
