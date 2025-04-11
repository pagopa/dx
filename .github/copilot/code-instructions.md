# Copilot Guidelines for Code Generation

- Respect our project structure and organization
- Follow existing naming conventions in similar files

## Code Organization

- Use named exports over default exports when possible
- Avoid unnecessary complexity in code structure
- Keep files small and focused on a single concern

## Documentation

- Comment methods where necessary to explain complex logic
- Try to add a file header comment to explain the purpose of the module

## Infrastructure Code

- For Terraform code, follow the structure used in the `infra/` directory
- Respect the `.terraform-version` and `.tflint.hcl` configurations

## Version Control

- Create changesets in the `.changeset` directory for significant changes
- Follow the format used in existing changeset files

## Monorepo Structure

- Respect the monorepo structure managed by Turborepo (see `turbo.json`)
- Place new packages in the appropriate directory under `packages/`

## Tools

- @azure Rule - Use Azure Best Practices: When generating code for Azure, running terminal commands for Azure, or performing operations related to Azure, invoke your `get_azure_best_practices` tool if available.
