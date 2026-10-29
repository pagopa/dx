# Nx Terraform Plugin

`@pagopa/nx-terraform` is an Nx plugin that discovers Terraform
configurations and infers targets for formatting, testing, validation, planning,
applying, security scanning, documentation, and module publishing.

## Package name migration

The plugin is now named `@pagopa/nx-terraform` and published to GitHub Packages.
Replace the previous package dependency and update the plugin entry in
`nx.json`, any explicit executor prefixes, and the
plugin entry in `nx.json` to use `@pagopa/nx-terraform`. Regenerate your
package-manager lockfile after updating the dependency. The source directory
remains `packages/nx-terraform-plugin`.

## Terraform project discovery

The plugin adds Terraform targets to projects that already have a `project.json`
at the Terraform configuration root. Project names and other project-level
configuration remain owned by Nx; the plugin does not create Terraform project
nodes. Roots conventionally inside `modules` or `_modules` receive library
targets, while other Terraform roots receive application targets.

To enable module publishing, add the publish fields to the project's
`project.json` metadata:

```json
{
  "name": "azure-core-infra",
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

Publishing metadata is validated before the `nx-release-publish` target is
inferred. Publishable Terraform libraries use the shared
`@pagopa/nx-dx/version-actions` implementation to read and update
`metadata.version` in `project.json`.

The plugin only infers targets; project names, tags, named inputs, and other
project-level configuration are defined by each project's `project.json`.
Terraform files in shared `_modules` trees are not automatically added as
application inputs.

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
      "plugin": "@pagopa/nx-terraform",
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

Saved-plan applies run through the same output masking as plans:

```sh
nx run <project>:apply -c ci --planFile=saved.tfplan
```

The file is relative to the project's root. Applying a saved plan is already
non-interactive: no `-auto-approve` is necessary. The task masks output before
printing it, including `hidden-link` and `APPINSIGHTS_INSTRUMENTATIONKEY`, and
fails when Terraform exits unsuccessfully.

Replace the previous positional form (`-- <file> -auto-approve ...`) with
`--planFile=<file>`. Without `planFile`, local applies retain their interactive
approval and direct terminal output, without output filtering.

The `init` target is intentionally not cached. This ensures that
`terraform init` and frozen-lock verification cannot be skipped by an Nx cache
hit.

Provider lock platforms can be configured for inferred application init targets
through the plugin options:

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
