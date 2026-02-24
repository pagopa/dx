---
description: This file describes the Terraform code style for the project.
applyTo: "**/*.tf, **/*.tfvars"
---

# Copilot Guidelines for Terraform Code

## General Rules

- Follow the structure used in the `infra/` directory.
- Respect the `.terraform-version` and `.tflint.hcl` configurations.
- Use the custom `dx` provider (see [providers/azure/](../../providers/azure/) and [providers/aws/](../../providers/aws/)) for enhanced DX features.
- Use DX provider methods to setup subnet CIDRs, resource naming, and other best practices.
- Organize infrastructure by environment and region in `infra/resources/<env>/<region>/`.
- Minimize parameter (argument) count with sensible defaults to maximize usability and reduce cognitive load for end users.
- Protect sensitive data using proper mechanisms (e.g., `sensitive = true`, secrets management).
- If you have a resource ID, compute related information internally rather than requiring separate inputs.

## Modules

- Every Terraform module MUST include a `README.md`, `examples/`, and a `tests/` directory.
- Follow the structure and conventions found in `infra/modules/`.
- Include a `package.json` and use `pnpm changeset` for any user-facing changes.
