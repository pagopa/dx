# Nx Terraform Plugin

`@pagopa/nx-terraform-plugin` is an Nx plugin that discovers Terraform
configurations and infers targets for formatting, testing, validation, planning,
applying, documentation, and module publishing.

## Terraform Test Conventions

The inferred `test` target separates Terraform tests into layers by using
fixed file names under each project's `tests` directory.

| Test layer  | Expected files                      | Nx command                             |
| ----------- | ----------------------------------- | -------------------------------------- |
| Unit        | `tests/unit.tftest.hcl`             | `nx run <project>:tf-test`             |
| Contract    | `tests/contract.tftest.hcl`         | `nx run <project>:tf-test`             |
| Integration | `tests/integration.tftest.hcl`      | `nx run <project>:tf-test:integration` |
| End-to-end  | Go test files matching `tests/*.go` | `nx run <project>:tf-test:e2e`         |

The default target runs the unit and contract files together. The `integration`
configuration runs only `integration.tftest.hcl`, while the `e2e`
configuration runs `go test` when the `tests` directory contains Go test
files.

Integration and end-to-end tests can share Terraform setup files from
`tests/setup/*.tf`. These files are included in the corresponding Nx cache
inputs.

All inferred test configurations depend on the plugin's Terraform initialization
target, which is `init` by default.
