# Nx Terraform Plugin

`@pagopa/nx-terraform-plugin` is an Nx plugin that discovers Terraform
configurations and infers targets for formatting, testing, validation, planning,
applying, documentation, and module publishing.

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
these files are included in the E2E target's cache inputs.

All inferred test targets depend on the plugin's Terraform initialization
target, which is `init` by default. Their names can be customized with
`testTargetName`, `testIntegrationTargetName`, and `e2eTargetName`.
