# @pagopa/monorepo-generator

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
