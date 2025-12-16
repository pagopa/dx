---
"@pagopa/dx-cli": minor
---

The `init` command now creates the repository

When running `dx init project` command, the CLI now tries to create the repository on GitHub.
It uses the generated Terraform files and attempts to run a `terraform apply` command.
