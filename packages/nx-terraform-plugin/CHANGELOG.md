## 0.4.1 (2026-07-01)

### 🧱 Updated Dependencies

- Updated @pagopa/dx-tasks to 0.2.1

## 0.4.0 (2026-06-30)

### 🚀 Features

- - Introduced the new `plan` executor, that now calls `terraformPlan` from `@pagopa/dx-tasks` ([#1897](https://github.com/pagopa/dx/pull/1897))
  - Changed `build` script from plain `tsc` to `tsdown`, in order to inline `@pagopa/dx-tasks`
  - Now each discovered application project, includes a `env:<env>` tag to enable project filtering based on `env`

### 🧱 Updated Dependencies

- Updated @pagopa/dx-tasks to 0.2.0

### ❤️ Thank You

- Copilot Autofix powered by AI @github-advanced-security[bot]
- Danilo Spinelli @gunzip
- Luca Cavallaro

## 0.3.2 (2026-06-25)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.1.0

## 0.3.1 (2026-06-09)

### 🩹 Fixes

- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))
- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.3.0 (2026-06-03)

### 🚀 Features

- Add inferred nx-release-publish target for publishable Terraform modules with module.json. ([#1736](https://github.com/pagopa/dx/pull/1736))

### ❤️ Thank You

- Copilot @Copilot
- Luca Cavallaro

## 0.2.1 (2026-05-05)

### 🩹 Fixes

- Upgrade some dependencies ([#1690](https://github.com/pagopa/dx/pull/1690))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.4

### ❤️ Thank You

- Marco Comi @kin0992

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