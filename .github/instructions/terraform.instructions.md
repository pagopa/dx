---
description: This file describes the Terraform code style for the project.
applyTo: **/*.tf, **/*.tfvars
---

# Copilot Guidelines for Terraform Code

- Follow the structure used in the `infra/` directory
- Respect the `.terraform-version` and `.tflint.hcl` configurations
- Use custom `dx` provider (see [providers/azure/](../../providers/azure/) and [providers/aws/](../../providers/aws/)) for enhanced DX features
- Use DX providers methods to setup subnet CIDRs, resource naming, and other best practices
- Infrastructure organized by environment and region in `infra/resources/<env>/<region>/`
