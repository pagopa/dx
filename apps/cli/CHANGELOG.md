# @pagopa/dx-cli

## 0.2.0

### Minor Changes

- 98738ac: Add `doctor` command

  The `doctor` command verifies the repository configuration.
  The first operation implemented is related to the monorepo scripts: it checks that the repository has the `npm` scripts used by the DX workflows.

### Patch Changes

- dfe8d6c: Improve `doctor` command to verify `pre-commit` configuration

  When running the `doctor` command, the CLI now verifies that the `.pre-commit-config.yaml` file exists.

## 0.1.2

### Patch Changes

- afee89d: Add `typecheck` script
- 5b31f4f: Upgrade to latest version of `@pagopa/eslint-config` package

## 0.1.1

### Patch Changes

- ecbe1d1: Load CLI version from package.json file during build time

## 0.1.0

### Minor Changes

- 318f695: Create DX CLI scaffold
