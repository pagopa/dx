# Nx Terraform Plugin

`@pagopa/nx-terraform-plugin` is an Nx plugin that discovers Terraform
configurations and infers targets for formatting, testing, validation, planning,
applying, security scanning, documentation, and module publishing.

## Trivy

The inferred `trivy` target scans each Terraform project with the workspace
`trivy.yml` configuration:

```sh
nx run <project>:trivy
```

The target runs from the workspace root so shared paths such as `.trivyignore`
and `.trivy/checks/terraform` resolve consistently. Its Nx cache inputs include
the Terraform sources, the Trivy configuration, the ignore file, and custom
checks.

## Terraform Test Conventions

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

All inferred test targets depend on the plugin's Terraform initialization
target, which is `init` by default.

## Target name prefix

The plugin uses fixed target suffixes for Terraform commands. Configure
`targetNamePrefix` to prepend the same value to each target that was previously
customizable:

```json
{
  "plugins": [
    {
      "plugin": "@pagopa/nx-terraform-plugin",
      "include": ["infra/**"],
      "options": {
        "targetNamePrefix": "tf"
      }
    }
  ]
}
```

The plugin inserts a hyphen between a nonempty target name prefix and each
target suffix. For example, `"tf"` produces `tf-init`, `tf-fmt`, `tf-test`,
`tf-test-integration`, and `tf-apply`; dependencies use the matching `tf-init`
target. The default target name prefix is `""`, which preserves the standard
target names.

## Terraform Module Locking

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

```sh
nx run <project>:init
```

By default, initialization updates the Terraform provider lock for
`windows_amd64`, `darwin_amd64`, `darwin_arm64`, and `linux_amd64`, and updates
the module lock when downloaded content changes. Use the `ci` configuration to
validate the provider lock without modifying it and freeze the module lock:

```sh
nx run <project>:init -c ci
nx run <project>:plan -c ci
nx run <project>:apply -c ci
```

Frozen initialization passes Terraform's `-lockfile=readonly` option to validate
`.terraform.lock.hcl` without modifying it. It also does not modify
`tfmodules.lock.json`; it fails when the generated module lock differs from the
committed file. Targets that depend on `init`, including `plan` and `apply`,
inherit the requested `ci` configuration and stop before execution when either
lock is invalid or stale.

The `init` target is intentionally not cached. This ensures that
`terraform init` and frozen-lock verification cannot be skipped by an Nx cache
hit.
