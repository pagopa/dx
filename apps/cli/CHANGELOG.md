## 0.21.0 (2026-04-29)

### 🚀 Features

- Add a global `--verbose` / `-v` flag and improve error messages precision across every `dx` subcommand. ([#1667](https://github.com/pagopa/dx/pull/1667))

  - The flag is now defined on the root program, so `dx --verbose <command>` (or `dx <command> --verbose`) works for `doctor`, `codemod`, `init`, `add`, `info` and `savemoney`. The existing subcommand-local `--verbose` on `savemoney` has been removed in favor of the inherited global option (same short/long names, same semantics).
  - When `--verbose` is active, the logger is configured at `debug` level so that detailed progress information emitted by internal components (cloud-account initialization, plop generators, Azure/GitHub adapters, etc.) is visible.
  - When a command fails in verbose mode, the CLI now prints the full error chain — including the underlying `cause` and the stack trace — instead of the top-level message alone.
  - Fix: `dx init project` no longer reports `ERR dx-cli·init Error on '<step>' step. undefined`. The plop action-runner was reading a non-existent `failure.message` property; it now reads `failure.error` (the field actually populated by `node-plop`) and includes the failing step type in the surfaced message. When multiple actions fail in the same run, all of them are aggregated in the thrown error.
  - Internal refactor: command handlers now propagate the original exception as `cause` when wrapping errors, and route failures through a shared `exitWithError` helper that decides between the concise and the detailed format based on the global verbose flag.

  No migration required for consumers. Existing scripts that pass `--verbose` to `dx savemoney` continue to work unchanged.

### ❤️ Thank You

- Marco Comi @kin0992

## 0.20.2 (2026-04-27)

### 🩹 Fixes

- Add roles: ([#1584](https://github.com/pagopa/dx/pull/1584))
  - Contributor
  - Storage Blob Data Contributor
  - Role Based Access Control Administrator

  to bootstrap managed identity for CD pipelines.

### ❤️ Thank You

- Andrea Grillo
- Christian Calabrese
- Mario Mupo @mamu0

## 0.20.1 (2026-04-22)

### 🩹 Fixes

- Update azure-core-infra module version from ~> 3.0 to ~> 4.0 ([#1658](https://github.com/pagopa/dx/pull/1658))

### ❤️ Thank You

- Christian Calabrese

## 0.20.0 (2026-04-22)

### 🚀 Features

- The core infrastructure now enables the creation of an Azure VPN. ([#1657](https://github.com/pagopa/dx/pull/1657))

### ❤️ Thank You

- Christian Calabrese

## 0.19.3 (2026-04-22)

### 🩹 Fixes

- When a new environment is initialized, the identities federated with GitHub can access Key Vault and alter roles on the Core's common resource group ([#1620](https://github.com/pagopa/dx/pull/1620))

### ❤️ Thank You

- Andrea Grillo

## 0.19.2 (2026-04-17)

### 🩹 Fixes

- Update the `init` command git flow to handle repositories that are pre-initialized by Terraform (`auto_init`). ([#1583](https://github.com/pagopa/dx/pull/1583), [#1574](https://github.com/pagopa/dx/issues/1574))

  Previously the CLI would push an initial commit directly to `main` and then create a feature branch — this fails when the remote already exists with a `main` branch.

  The new flow connects to the existing remote, fetches the current state, and creates the feature branch from `origin/main` without checking out remote files (preserving locally generated files). The PR is then opened against `main` as usual.

- Upgrade dependencies ([#1639](https://github.com/pagopa/dx/pull/1639))
- Parse Azure authorization with JSON format instead of HCL ([#1541](https://github.com/pagopa/dx/pull/1541))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.3
- Updated @pagopa/dx-savemoney to 0.2.4

### ❤️ Thank You

- Copilot @Copilot
- Marco Comi @kin0992

## 0.19.1 (2026-04-08)

### 🩹 Fixes

- Add `onlyBuiltDependencies` block to `pnpm-workspace.yaml` file to prevent warnings during `pnpm install` operation. ([#1580](https://github.com/pagopa/dx/pull/1580))

  We want to allow the execution of the postinstall script for `nx`.

### ❤️ Thank You

- Copilot @Copilot
- Marco Comi @kin0992

## 0.19.0 (2026-04-03)

### 🚀 Features

- Update dx doctor to check for Nx ([#1554](https://github.com/pagopa/dx/pull/1554))
- Generated workspaces now use Nx instead of Turborepo ([#1551](https://github.com/pagopa/dx/pull/1551))
- Remove environment initialization from init command ([#1552](https://github.com/pagopa/dx/pull/1552))

### ❤️ Thank You

- Copilot @Copilot
- Luca Cavallaro

## 0.18.13 (2026-04-02)

### 🩹 Fixes

- Include the project repository name in the branch name created on `eng-azure-authorization` when requesting Azure subscription authorization. ([#1545](https://github.com/pagopa/dx/pull/1545))

  Previously the branch was named `feats/add-<subscription>-bootstrap-identity`, which caused a conflict when multiple teams initialized projects on the same Azure subscription at the same time.

  The branch is now named `feats/add-<repo>-<subscription>-bootstrap-identity`, making it unique per (repository, subscription) pair.

### ❤️ Thank You

- Copilot @Copilot
- Marco Comi @kin0992

## 0.18.12 (2026-04-01)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.2
- Updated @pagopa/dx-savemoney to 0.2.3

## 0.18.11 (2026-03-26)

### 🩹 Fixes

- Add .tflint.hcl to the monorepo template ([#1505](https://github.com/pagopa/dx/pull/1505))

### ❤️ Thank You

- Luca Cavallaro

## 0.18.10

### Patch Changes

- 66b392d: Update to support the newest version of @pagopa/eslint-config (eslint10, new rules)
- Updated dependencies [66b392d]
  - @pagopa/dx-savemoney@0.2.1

## 0.18.9

### Patch Changes

- 9e67b60: Wire Azure authorization request to the `init` command

## 0.18.8

### Patch Changes

- 70f8561: Enable RBAC-based access for the Key Vault integration used by the GitHub private runner created by the generated bootstrapper module
- 039df6e: Fix pre-commit-terraform version definition in pre-commit-config.yaml template
- 4f8e104: Register Azure providers when creating a subscription

## 0.18.7

### Patch Changes

- d547c62: Update CLI commands for SaveMoney new features
- Updated dependencies [d547c62]
  - @pagopa/dx-savemoney@0.2.0

## 0.18.6

### Patch Changes

- 01f9318: The encode of the `github-runner-app-key` in `base64` when stored in the common kv has been reverted. The secret is now stored as plain value and stripped for trailing newlines.

## 0.18.5

### Patch Changes

- e0a3767: Upgrade dependencies
- Updated dependencies [e0a3767]
  - @pagopa/dx-savemoney@0.1.6

## 0.18.4

### Patch Changes

- 4a5813b: Use workspace protocol for @pagopa/dx-savemoney
- 1834d54: Improve user input validation and make sure to follow proper formatting of some parameters

## 0.18.3

### Patch Changes

- 0f96dab: Add `corepack` as required tool for `init` command
- 24e7b3b: Encode `github-runner-app-key` in `base64` when stored in the common kv

## 0.18.2

### Patch Changes

- 8f76777: Update key vault properties to enable recover

## 0.18.1

### Patch Changes

- 2d3d8fb: Update tsconfig base
- Updated dependencies [2d3d8fb]
  - @pagopa/dx-savemoney@0.1.5

## 0.18.0

### Minor Changes

- f0ce0c9: Init now requires a GitHub App for self-hosted runners
- 6074052: Add add command to scaffold new components

## 0.17.0

### Minor Changes

- 907253d: Create a function useful to add a Bootstrap Identity to an Azure subscription. This function creates a Pull Request on eng-azure-authorization repository to add the identity.

## 0.16.3

### Patch Changes

- e63fe56: Add github provider to bootstrapper template

## 0.16.2

### Patch Changes

- c442a4d: Fix issues on published package

## 0.16.1

### Patch Changes

- daa0c37: - Update error message to include tfenv setup instructions when Terraform is not found
  - Display Azure account name in login success message

## 0.16.0

### Minor Changes

- 20c2a64: Include environment generator in init command

## 0.15.5

### Patch Changes

- cf52efc: Fix GitHub workflows glob pattern when applying pnpm codemod

## 0.15.4

### Patch Changes

- b6a064c: Move node-plop to dependencies

## 0.15.3

### Patch Changes

- 2e76daf: Move plop generators from @pagopa/monorepo-generator

## 0.15.2

### Patch Changes

- 73f2d78: Add version to workflow name

## 0.15.1

### Patch Changes

- 58cdd75: Fix regex to preserve whitespace when replacing package manager names
- Updated dependencies [c1dfbea]
  - @pagopa/monorepo-generator@0.15.1

## 0.15.0

### Patch Changes

- Updated dependencies [493ddd1]
  - @pagopa/monorepo-generator@0.15.0

## 0.14.5

### Patch Changes

- 4cc5bf7: The `init` command now checks if the specified GitHub repository already exists before proceeding. If the repository exists, the command will fail early with a clear error message, preventing accidental overwrites and ensuring that only new repositories can be created.

## 0.14.4

### Patch Changes

- df2cb42: Update regex to avoid unwanted changes
- df2cb42: Move pnpm-config-pagopa settings into local config

## 0.14.3

### Patch Changes

- 011a256: Add a `console.error` log message to log the error

## 0.14.2

### Patch Changes

- f04ba73: Add Node.js version check to use-pnpm codemod

## 0.14.1

### Patch Changes

- 84422c0: Update dependencies
- Updated dependencies [84422c0]
- Updated dependencies [84422c0]
- Updated dependencies [a65c2a7]
- Updated dependencies [91e5911]
  - @pagopa/monorepo-generator@0.14.1

## 0.14.0

### Minor Changes

- 56f3342: The `init` command now creates the repository

  When running `dx init project` command, the CLI now tries to create the repository on GitHub.
  It uses the generated Terraform files and attempts to run a `terraform apply` command.

### Patch Changes

- 2baf913: Enhance the `init` command to automatically create a Pull Request after scaffolding a new repository
- b3f5de0: Remove tailing `}` that was added to the branch name
- ef9059b: The `init` command now creates a local git repository and pushes code to the origin.
  It pushes the README file to the default branch, and pushes the code generated by the scaffolder to a separate branch.

## 0.13.0

### Patch Changes

- Updated dependencies [200a33b]
- Updated dependencies [49a0087]
  - @pagopa/monorepo-generator@0.13.0

## 0.12.0

### Minor Changes

- 9998df5: Refactor the `init` command to show a summary of the execution

### Patch Changes

- Updated dependencies [9998df5]
- Updated dependencies [5399a25]
- Updated dependencies [9998df5]
  - @pagopa/monorepo-generator@0.12.0

## 0.11.2

### Patch Changes

- d187d76: Add the `execa` adapter to allow the execution of shell commands.

  The new `executeCommand` function provides a simple Promise-based wrapper around `execa` that returns `"success"` for commands that exit with code 0, or `"failure"` for commands that exit with non-zero codes or fail to execute.

  Example usage:

  ```typescript
  import { executeCommand } from "./adapters/execa/index.js";

  const result = await executeCommand("ls", ["-la"], { cwd: "/tmp" });
  if (result === "success") {
    console.log("Command executed successfully");
  } else {
    console.log("Command failed");
  }
  ```

- Updated dependencies [a088076]
  - @pagopa/monorepo-generator@0.11.2

## 0.11.1

### Patch Changes

- fb9caa2: Update dependencies
- Updated dependencies [c7421af]
- Updated dependencies [fb9caa2]
  - @pagopa/monorepo-generator@0.11.1

## 0.11.0

### Patch Changes

- bf456ea: Refactored CLI to work outside repository context for commands that don't require it.
  - The CLI no longer fails to start when run outside a Git repository
  - The `doctor` command now explicitly checks for repository context and returns a clear error message if not in a repository

- 9d4109c: Upgrade dependencies
- eb84990: Update README
- Updated dependencies [9d4109c]
- Updated dependencies [9d4109c]
- Updated dependencies [9d4109c]
  - @pagopa/monorepo-generator@0.11.0
  - @pagopa/dx-savemoney@0.1.4

## 0.10.3

### Patch Changes

- e8e1bd1: Fixed the `use-pnpm` logic bug that prevented the update of the legacy deployment workflows

## 0.10.2

### Patch Changes

- cfb975f: Update CLI README with Static Web App check in SaveMoney tool
- Updated dependencies [cfb975f]
  - @pagopa/dx-savemoney@0.1.3

## 0.10.1

### Patch Changes

- ccc9ff1: Update README for savemoney Container App
- 8d0d661: Remove `init` command feature flag

  Now, if you want to use the `init` command, you don't need to set any feature flag. Just run:

  ```bash
  npx @pagopa/dx-cli init project
  ```

  and follow the interactive prompts to create a new monorepo project.

- Updated dependencies [140a047]
- Updated dependencies [ccc9ff1]
  - @pagopa/monorepo-generator@0.10.1
  - @pagopa/dx-savemoney@0.1.2

## 0.10.0

### Minor Changes

- c23cddf: Remove version|v command. Use -V to get the cli version.

## 0.9.0

### Minor Changes

- d8e47d0: Add `dx savemoney` command to the DX CLI for analyzing Azure provider resources for cost optimization opportunities

### Patch Changes

- Updated dependencies [d8e47d0]
  - @pagopa/dx-savemoney@0.1.0

## 0.8.2

### Patch Changes

- 90ac56c: Fix regex in `use-pnpm` codemod

## 0.8.1

### Patch Changes

- d86e8d6: Add .pnpm-store to .gitignore
- 6e1ec37: Update `update-code-review` codemod to support the latest version of the workflow

## 0.8.0

### Patch Changes

- 2caf863: Remove `ENABLE_CODEMODS` feature flag
- 99516d2: `use-azure-appsvc` codemod now adds `permissions` to the updated GitHub Action workflow
- f989fa7: Add support for `npm`, migrate `packageExtensions`, use `workspace:` protocol
- Updated dependencies [13374c8]
- Updated dependencies [13374c8]
  - @pagopa/monorepo-generator@0.8.0

## 0.7.0

### Minor Changes

- eefc4d3: Add `use-pnpm` codemod to migrate a project from yarn to pnpm
- eefc4d3: Add `update-code-review` codemod to update the `js_code_review` workflow to the latest version
- eefc4d3: Add `use-azure-appsvc` codemod to migrate legacy deployment workflows

## 0.6.0

### Minor Changes

- fa4e825: Create the `init` command

  This command is going to be used to initialize a new project (a monorepo) using the DX CLI.

### Patch Changes

- Updated dependencies [051f215]
- Updated dependencies [155cb81]
- Updated dependencies [7171d9d]
- Updated dependencies [155cb81]
- Updated dependencies [f638ad6]
- Updated dependencies [38396b0]
- Updated dependencies [fa4e825]
- Updated dependencies [7171d9d]
  - @pagopa/monorepo-generator@0.6.0

## 0.5.0

### Minor Changes

- 8abeb56: Experimental: Add `codemod` command behind `ENABLE_CODEMODS` feature flag

## 0.4.4

### Patch Changes

- 2dbc275: Remove `DependencyName` type.

  At the moment we do not need to have a strong type to handle the name of a dependency; a simple string it is enough.

## 0.4.3

### Patch Changes

- 1278fca: When running the `info` command, if `turbo` is configured, it shows its version.
- 394f5aa: Verify the monorepo's workspaces

  When running the `doctor` command, the CLI will check the workspaces are properly configured.

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
