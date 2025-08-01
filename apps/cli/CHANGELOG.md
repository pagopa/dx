# @pagopa/dx-cli

## 0.4.2

### Patch Changes

- e4d46cb: Remove whitespaces from the `node` version printed in the `info` command.

## 0.4.1

### Patch Changes

- 9599934: Check the version of Node.JS, by checking the `.node-version` file in the root of the project.

  If the file does not exist, then it returns `undefined`.

- beadc6c: Remove `private` property from `package.json`.

  The CLI is going to be available as NPM package.

- eefa19c: Extract `readFile` function and add it to `RepositoryReader` interface
- 62c24ce: Check the version of Terraform, by checking the `.terraform-version` file in the root of the project.

## 0.4.0

### Minor Changes

- c1506a5: Show `packageManager` in `info` command

  This command should show some information about the project.
  For now, it prints the `packageManager` detected.

### Patch Changes

- bf472f4: Refactor on the `detectPackageManager` to improve readability
- f971dbd: Refactor the `doctor` command logic call the functions from the domain.

  The business logic hasn't changed.

- 9ce560b: Remove redundant functions

  Remove `existsPreCommitConfig`, `existsTurboConfig` and replace them with the `fileExists` function.

  Pass the `Config` object to `checkTurboConfig`, `checkPreCommitConfig` and `checkMonorepoScripts` where the repository root path is available.

  Remove the call to `findRepositoryRoot` in the `runDoctor` function, because the repository root path is passed in the `Config` object.

## 0.3.2

### Patch Changes

- 35645df: Convert the functions of the RepositoryReader interface to async

  This change was made to ensure all file system operations are handled asynchronously, improving performance and consistency across the codebase.

## 0.3.1

### Patch Changes

- 51fcd3b: Enhance CLI code

  Move some objects (and decoder) to the domain layer.
  Simplify assertions in the unit tests
  Extract a readFile function to favor reuse
  Set `node` engine minimum version to 22: we are using some new API introduced in Node v22

## 0.3.0

### Minor Changes

- 25f7786: Migrate to Node 22

## 0.2.2

### Patch Changes

- 2a6b261: Improve `doctor` command to verify `turbo` configuration

  When running the `doctor` command, the CLI now verifies that the `turbo.json` file exists and that the `turbo` version is valid.

## 0.2.1

### Patch Changes

- ce98aa8: Bump dependencies to fix a peerDependency warning

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
