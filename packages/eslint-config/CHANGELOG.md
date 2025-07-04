# @pagopa/eslint-config

## 5.0.0

### Major Changes

- 5b31f4f: Migrate to ESLint version 9

  ### Major Changes
  - **ESLint 9 Support**: Added support for ESLint 9.x
  - **Official Vitest Plugin**: Replaced `eslint-plugin-vitest@0.5.4` with the official `@vitest/eslint-plugin@^1.3.4` for better ESLint 9 compatibility
  - **Updated Dependencies**: Updated all ESLint-related dependencies to their latest versions compatible with ESLint 9
  - **Peer Dependencies**: Updated peer dependencies to require ESLint `^9`

  ### Breaking Changes
  - You must upgrade to ESLint 9.x
  - The old `eslint-plugin-vitest` package has been replaced with the official `@vitest/eslint-plugin`

## 4.0.6

### Patch Changes

- 4316a40: Add the `repository` block in the `package.json` in order to verify provenance attestation

## 4.0.5

### Patch Changes

- e1202f1: Upgrade typescript-eslint to a version compatible with the Typescript version used

## 4.0.4

### Patch Changes

- 1667bf1: Upgrade dependencies

## 4.0.3

### Patch Changes

- cfd31cf: Fix peerDependencies semver requirement

## 4.0.2

### Patch Changes

- 1d9504e: Add `typescript` as dependency.

  `typescript-eslint` package requires `typescript` as dependency starging from version 8.

## 4.0.1

### Patch Changes

- 351035e: Fix vitest configuration; ignore "generated" folder

## 4.0.0

### Major Changes

- 8c68693: Updated configuration to match our current code style, switched to flat config file.
