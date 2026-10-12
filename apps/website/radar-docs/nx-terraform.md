---
title: "@pagopa/nx-terraform"
ring: adopt
tags: [terraform, iac, infrastructure, monorepo, dx, tool]
---

[`@pagopa/nx-terraform`](https://github.com/pagopa/dx/tree/main/packages/nx-terraform-plugin)
is the DX Nx plugin that discovers Terraform configurations and infers targets
for formatting, validation, testing, planning, applying, security scanning,
documentation, and module publishing, wiring every module and environment into
the Nx project graph.

## Use cases

- Running `nx affected` and Nx task caching over Terraform projects, alongside
  application code
- Standardizing `fmt`, `validate`, `init`, `plan`, and `apply` targets across
  modules and environments, with frozen module lock support in CI
- Scanning Terraform code with `trivy` using the workspace configuration
- Running unit, contract, integration, and end-to-end Terraform tests through
  inferred targets
- Publishing modules to the Terraform Registry from the workspace

## DX ecosystem

- [Package source](https://github.com/pagopa/dx/tree/main/packages/nx-terraform-plugin)
- [Package README](https://github.com/pagopa/dx/blob/main/packages/nx-terraform-plugin/README.md)
