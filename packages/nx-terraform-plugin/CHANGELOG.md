## 0.2.0 (2026-04-27)

### 🚀 Features

- Add inferred tflint and terraform-docs targets to the Terraform Nx plugin ([#1663](https://github.com/pagopa/dx/pull/1663))

### ❤️ Thank You

- Mario Mupo @mamu0

## 0.2.0-rc.0 (2026-04-20)

### 🚀 Features

- Terraform projects now expose a default set of targets for common Terraform CLI commands. ([#1638](https://github.com/pagopa/dx/pull/1638))

  Every Terraform project will include `init`, `format`, `validate`, `test`, `output`, and `console`. Terraform application projects will also include `plan` and `apply`.

  All target names are configurable, via a dedicated `<targetName>TargetName` property on plugin configuration.

### ❤️ Thank You

- Copilot @Copilot
- Luca Cavallaro

## 0.1.0-rc.0 (2026-04-17)

### 🚀 Features

- Implement `@pagopa/nx-terraform-plugin`, with project graph support and incremental processing of changed files only. ([#1588](https://github.com/pagopa/dx/pull/1588))

  With this release, it supports:

  - Automatic project discovery: it creates a project for each directory containing Terraform configuration files (.tf)
  - Project graph support: it creates dependencies between projects based on Terraform module references

- Skip creating Nx projects for Terraform files located under tests/\_tests and examples/example directories ([#1627](https://github.com/pagopa/dx/pull/1627))
- Add projectType to generated project configurations, classifying paths under modules/\_modules as library and others as application ([#1627](https://github.com/pagopa/dx/pull/1627))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.3

### ❤️ Thank You

- Luca Cavallaro
- Marco Comi @kin0992