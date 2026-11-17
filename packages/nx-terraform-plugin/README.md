# Nx Terraform Plugin

`@pagopa/nx-terraform` is an Nx plugin that infers Terraform targets for
formatting, linting, testing, validation, security scanning, documentation,
planning, applying, and module publishing.

## Installation

The plugin is published to GitHub Packages. Install it with pnpm's `gh:` alias:

```sh
pnpm add -D @pagopa/nx-terraform@gh:latest
```

Then register it in `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@pagopa/nx-terraform",
      "include": ["infra/**"]
    }
  ]
}
```

## Options

| Option                   | Default    | Description                                                                                |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `targetNamePrefix`       | `""`       | Prefix added to every inferred target name. See [Target name prefix](#target-name-prefix). |
| `initTarget.platforms`   | `[]`       | Provider lock platforms for application `init` targets.                                    |
| `additionalEnvironments` | `[]`       | Directory names recognized as environments, in addition to `prod`, `uat`, and `dev`.       |
| `publish.mode`           | `"github"` | Module publishing backend.                                                                 |
| `publish.github.owner`   | none       | Default GitHub owner for published modules. Enables GitHub App authentication.             |

## Project discovery

The plugin does not create projects. A directory becomes a Terraform project
when it contains both `*.tf` files and a `project.json`. The `project.json`
owns the project name and any explicit configuration; the plugin contributes
the following on top of it:

- **Project type:** roots inside a `modules` or `_modules` directory are
  `library` projects; every other root is an `application`.
- **Tags:** every project gets `terraform`. Applications also get
  `env:<environment>`, taken from the first path segment matching a known
  environment (`prod` when none matches). Publishable libraries also get
  `terraform:public`.
- **Named inputs:** `default` (the project's `*.tf` and `*.tfvars` files, plus
  the environment's shared `_modules` tree for applications, so changes there
  mark them as affected) and `examples`.
- **Targets:** see [Targets](#targets).
- **Release configuration:** only for publishable libraries. See
  [Module publishing](#module-publishing).

A minimal `project.json` is enough:

```json
{
  "name": "policy-dev"
}
```

Directories named `tests`, `_tests`, `examples`, or `example` are never
projects.

## Targets

| Target               | Project type | Inferred when                | Command                                |
| -------------------- | ------------ | ---------------------------- | -------------------------------------- |
| `init`               | all          | always                       | `terraform init` (lock-aware for apps) |
| `fmt`                | all          | always                       | `terraform fmt`                        |
| `validate`           | all          | always                       | `terraform validate`                   |
| `trivy`              | all          | always                       | `trivy config`                         |
| `lint`               | all          | a root `.tflint.hcl` exists  | `tflint`                               |
| `test`               | all          | unit or contract tests exist | `terraform test`                       |
| `test-integration`   | all          | integration tests exist      | `terraform test`                       |
| `e2e`                | all          | Go tests exist               | `go test`                              |
| `console`            | all          | always                       | `terraform console`                    |
| `output`             | all          | always                       | `terraform output`                     |
| `docs`               | library      | always                       | `terraform-docs`                       |
| `nx-release-publish` | library      | publishing metadata is valid | publish executor                       |
| `plan`               | application  | always                       | plan executor                          |
| `apply`              | application  | always                       | apply executor                         |

`fmt` and `docs` have a `ci` configuration that checks instead of writing.

## Module publishing

A library becomes publishable when its `project.json` `metadata` contains the
publishing fields:

```json
{
  "name": "azure_core_infra",
  "metadata": {
    "description": "Core Azure infrastructure module.",
    "provider": "azurerm",
    "version": "6.0.7",
    "github": {
      "owner": "pagopa-dx"
    }
  }
}
```

| Field          | Required | Description                                                               |
| -------------- | -------- | ------------------------------------------------------------------------- |
| `description`  | yes      | Module description.                                                       |
| `provider`     | yes      | Terraform provider name.                                                  |
| `version`      | yes      | Current semver version, without a `v` prefix.                             |
| `github.owner` | no       | GitHub owner. Required if `publish.github.owner` is not set in `nx.json`. |

Metadata is validated during discovery. Invalid metadata logs a warning and
the project gets no `nx-release-publish` target.

Publishable libraries are configured for Nx Release with the
`@pagopa/nx-dx/version-actions` implementation, which reads and bumps
`metadata.version` in `project.json`. Use version plans and `nx release` as
for any other package.

The publish executor pushes the module to its GitHub repository and tags the
release. It authenticates with `GH_TOKEN` or `GITHUB_TOKEN`. When
`publish.github.owner` is set in `nx.json`, it instead generates an
installation token from `GH_APP_CLIENT_ID` and `GH_APP_KEY`.

## Target name prefix

Configure `targetNamePrefix` to prepend a value to every inferred target name:

```json
{
  "plugins": [
    {
      "plugin": "@pagopa/nx-terraform",
      "include": ["infra/**"],
      "options": {
        "targetNamePrefix": "tf"
      }
    }
  ]
}
```

The plugin inserts a hyphen between a nonempty prefix and each target name.
For example, `"tf"` produces `tf-init`, `tf-fmt`, `tf-test`,
`tf-test-integration`, and `tf-apply`; dependencies use the matching `tf-init`
target. `nx-release-publish` is never prefixed, because Nx Release requires
that name.

## Trivy

The `trivy` target scans each Terraform project with the workspace `trivy.yml`
configuration:

```sh
nx run <project>:trivy
```

The target runs from the workspace root so shared paths such as `.trivyignore`
and `.trivy/checks/terraform` resolve consistently. Its Nx cache inputs include
the Terraform sources, the Trivy configuration, the ignore file, and custom
checks.

## Terraform test conventions

The plugin infers independent test targets from fixed file names under each
project's `tests` directory.

| Test layer  | Expected files                           | Nx command                          |
| ----------- | ---------------------------------------- | ----------------------------------- |
| Unit        | `tests/unit.tftest.hcl`                  | `nx run <project>:test`             |
| Contract    | `tests/contract.tftest.hcl`              | `nx run <project>:test`             |
| Integration | `tests/integration.tftest.hcl`           | `nx run <project>:test-integration` |
| End-to-end  | Go test files matching `tests/*_test.go` | `nx run <project>:e2e`              |

The `test` target runs the unit and contract files that are present. Each target
is inferred only when its expected test file exists, so Nx commands such as
`run-many --target e2e` select only projects with that test layer.

Integration tests can share Terraform setup files from `tests/setup/`. These
files are included in the integration target's Nx cache inputs. E2E tests
deploy the module's `examples/` and use the applications under `tests/apps/`;
all files under `tests/` and `examples/` are included in the E2E target's cache
inputs.

All inferred test targets depend on the `init` target.

## Terraform module locking

Application projects use a lock-aware `init` target that runs `terraform init`
and records the content of downloaded Terraform Registry modules in
`tfmodules.lock.json`. Library projects keep plain Terraform initialization and
do not generate module lockfiles.

The lock uses version 2 of the format:

```json
{
  "lockFileVersion": 2,
  "modules": {
    "module_name": {
      "hash": "...",
      "source": "https://registry.terraform.io/modules/..."
    }
  }
}
```

Version 2 contains only module hashes and Registry sources. A normal
initialization migrates older lock formats at runtime; frozen CI rejects them
until the migration has been written.

By default, initialization updates the module lock when downloaded content
changes. Use the `ci` configuration to freeze the lock:

```sh
nx run <project>:init -c ci
nx run <project>:plan -c ci
nx run <project>:apply -c ci
```

Frozen initialization does not modify `tfmodules.lock.json`; it fails when the
generated lock differs from the committed file. Targets that depend on `init`,
including `plan` and `apply`, inherit the requested `ci` configuration and stop
before execution when the module lock is stale.

The `init` target is intentionally not cached. This ensures that
`terraform init` and frozen-lock verification cannot be skipped by an Nx cache
hit.

Provider lock platforms can be configured for application `init` targets:

```json
{
  "plugins": [
    {
      "plugin": "@pagopa/nx-terraform",
      "include": ["infra/**"],
      "options": {
        "initTarget": {
          "platforms": ["linux_amd64", "darwin_arm64"]
        }
      }
    }
  ]
}
```

When platforms are configured, initialization runs
`terraform providers lock -enable-plugin-cache -platform=...` after
`terraform init`. An empty platform list skips provider locking. Frozen
initialization runs `terraform init -lockfile=readonly` and fails if either
`.terraform.lock.hcl` or `tfmodules.lock.json` changes.

## Plan and apply

`plan` prints the full plan locally. Its `ci` configuration refreshes state,
writes a `dx-tasks` JSON report, and prints a condensed plan.

Saved-plan applies run through the same output masking as plans:

```sh
nx run <project>:apply -c ci --planFile=saved.tfplan
```

The file is relative to the project's root. Applying a saved plan is already
non-interactive: no `-auto-approve` is necessary. The task masks output before
printing it, including `hidden-link` and `APPINSIGHTS_INSTRUMENTATIONKEY`, and
fails when Terraform exits unsuccessfully. Without `planFile`, local applies
keep their interactive approval and direct terminal output, without output
filtering.
