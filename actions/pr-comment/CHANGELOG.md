## 0.2.2 (2026-04-17)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.3

## 0.2.1

### Patch Changes

- f74034d: Reference GitHub Actions dependencies from dedicated catalog

## 0.2.0

### Minor Changes

- 63a37d7: Upgrade `@actions/core` from `^1.11.1` to `^3.0.0` and `@actions/github` from `^6.0.0` to `^9.0.0`.

  Also fixed a pre-existing bug in the test suite where `toHaveBeenCalledWith()` was called without arguments, causing a false assertion in the "should handle comment deletion errors gracefully" test case.

## 0.1.5

### Patch Changes

- 66b392d: Update to support the newest version of @pagopa/eslint-config (eslint10, new rules)

## 0.1.4

### Patch Changes

- 2d3d8fb: Update tsconfig base

## 0.1.3

### Patch Changes

- 2b751a4: Update references to the new DX website from pagopa.github.io/dx to dx.pagopa.it

## 0.1.2

### Patch Changes

- 25f7786: Replace `@tsconfig/node20` with `@tsconfig/node22`

## 0.1.1

### Patch Changes

- b8ef216: Set private property to true

  This package does not need to be published to npm registry.

## 0.1.0

### Minor Changes

- 0019182: Refactor PR Comment Action to TypeScript and update workflows

### Patch Changes

- 1026f87: Fix lint issue
- 2cbf30f: Do format files to fix an issue during code-review
