# @pagopa/monorepo-generator

## 0.6.0

### Minor Changes

- 051f215: Add Drift Detection workflow in the monorepo template

  Convert the existing workflow to accept parameters, so it is possible to generate jobs based on the selected environments.

- f638ad6: Install `@devcontainers/cli` as a project devDependency and use it to configure the DevContainers.

  With DevContainers, you can easily set up a consistent development environment across different machines. This is particularly useful for onboarding new team members, as they can quickly get started without worrying about local setup issues.

### Patch Changes

- 155cb81: Add changeset configuration
- 7171d9d: Now, when `turbo` runs the `typecheck` task, it checks if it needs to build a package first.

  This is necessary when there is a workspace that depends on another workspace that needs to be built (e.g. a package with source code in `src` that needs to be compiled to `dist`).

- 155cb81: Integrate README with instruction to use changeset
- 38396b0: When scaffolding a new monorepo, the generator creates a README file as well
- fa4e825: Remove `plop` from `peerDependencies` block

  `plop` is not required to use `@pagopa/monorepo-generator` as a library, so it should not be listed in `peerDependencies`.

- 7171d9d: Instruct the scaffolder to install `turbo`

## 0.5.0

### Minor Changes

- f23dea2: Enable `pnpm` and configure `pnpm-plugin-pagopa`

  With this change, the generated monorepo will use `pnpm` as package manager and will be configured to use `pnpm-plugin-pagopa`.
  You can find more information about `pnpm-plugin-pagopa` [here](https://github.com/pagopa/dx/blob/main/packages/pnpm-plugin-pagopa/README.md).

### Patch Changes

- 41b3c8d: Get pre-commit revision dynamically, so it's always up to date

## 0.4.1

### Patch Changes

- 5371c5e: Fetch latest terraform version dynamically

## 0.4.0

### Minor Changes

- 9af6b57: Generate Terraform file to manage the GitHub repository during scaffolding

## 0.3.1

### Patch Changes

- 2b751a4: Update references to the new DX website from pagopa.github.io/dx to dx.pagopa.it

## 0.3.0

### Minor Changes

- 9ba06a2: Add the templates for the infra plan and apply and update the generator to scaffold them
- 5a0fc56: Add the `.pre-commit-config.yaml` to the template

  The generator already scaffold the dotfiles (`.`), so when executing the generator, you will have the `.pre-commit-config.yaml` file created in your project.

- 40424ad: Add templates for `.gitignore`, `.prettierignore` and `.trivyignore`
- 36b387f: Create a template for `turbo` configuration file and instruct the generator to generate it

## 0.2.0

### Minor Changes

- 14d386d: Create a `plop` generator to scaffold a new monorepo
- a497de3: Add `.terraform-version` file to `monorepo` generator.

  Instruct the monorepo scaffolder to generate the dotfiles (like `.gitignore`, `.editorconfig` and `.terraform-version`).

- 82a2d73: Add template for `package.json` file

### Patch Changes

- 04593ab: Generate the `package.json` file when running the monorepo generator

## 0.1.1

### Patch Changes

- 2c6340b: Add `trim_trailing_whitespace` to editorconfig file

## 0.1.0

### Minor Changes

- 3f930d1: Create package that will scaffold a new monorepo
- 3f930d1: Add `.editorconfig` file to the templates.
