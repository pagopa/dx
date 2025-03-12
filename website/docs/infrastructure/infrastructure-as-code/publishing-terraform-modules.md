---
sidebar_label: Publishing Terraform modules to the Registry
---


# Publishing Terraform modules to the Registry

This guide walks through the process of creating, developing, and publishing Terraform modules from the [DX monorepo](https://github.com/pagopa/dx) to the Terraform Registry.

:::note

This documentation is intended for contributors working on DevEx Terraform modules.

:::

The Terraform Registry serves as a central repository where organizations can publish and share their Terraform modules with the community. It provides a standardized way to discover, distribute, and version infrastructure as code components. Our organization maintains a collection of modules in the PagoPA namespace, which you can find [here](https://registry.terraform.io/namespaces/pagopa-dx).

We'll cover the entire lifecycle from initialization to publication, including our versioning system and automated workflows.

Our Terraform modules are organized in the `infra/modules` directory, with each module containing its own code, tests, and examples.

## Module Development and Versioning

We use [Changeset](https://github.com/changesets/changesets) for version management and changelog generation. This helps maintain a clear history of changes and ensures proper [semantic versioning](https://semver.org/).

### Managing Changes with Changeset

Before starting development:

1. Initialize and install dependencies:
   ```bash
   yarn install
   ```

2. After making changes, create a changeset:
   ```bash
   yarn changeset
   ```

This will prompt you to:
- Select the type of change (major/minor/patch)
- Provide a description of your changes
- Review and confirm

### Publishing Process

When you're ready to publish your changes:

1. The Changeset release action will automatically create a pull request
2. Review and merge the pull request to trigger:
   - Version bumping
   - Changelog updates
   - Code publication to the module sub-repository
   - Tag creation

### A brief introduction

The Terraform Registry has specific requirements about repository structure - each module must live in its own repository with a standardized naming convention. To accommodate this while maintaining the benefits of a monorepo development workflow, we've implemented an automated system that:

1. Takes the code from our monorepo's `infra/modules` directory
2. Pushes each module to its dedicated sub-repository, following the Terraform Registry naming convention:
   - Repository name format: `terraform-<PROVIDER>-<NAME>`
   - Example: `terraform-azurerm-azure-api-management`

This process is handled by the [`Push modules to subrepo`](https://github.com/pagopa/dx/blob/main/.github/workflows/push_modules_to_subrepo.yml) GitHub Action, which:
- Identifies modified modules in the monorepo
- Updates their respective sub-repositories with the latest code
- Ensures version tags are properly synchronized

For example, if you have three modules in your monorepo:
```
infra/modules/
  ├── azure_api_management/
  ├── azure_container_app/
  └── azure_cosmos_db/
```

They will be automatically pushed to separate repositories:
- `terraform-azurerm-azure-api-management`
- `terraform-azurerm-azure-container-app`
- `terraform-azurerm-azure-cosmos-db`

Each sub-repository maintains its own version history and tags, making it compatible with the Terraform Registry while allowing us to keep our centralized development workflow in the monorepo.

![Monorepo splitting strategy](./publishing-terraform-modules/push-to-subrepo.png)

This approach gives us the best of both worlds:
- Centralized development and code review in our monorepo
- Compliance with Terraform Registry requirements
- Automated version management and changelog generation
- Clean, separate version histories for each module


## How to publish a module

### Initialize the module

To create a new module, we provide an automated initialization script called `add-module.sh` located in the `infra/scripts` directory. This script handles all the necessary setup steps and ensures consistency across module creation.

The script must be executed in the root of the dx repository and accepts the following parameters:

```bash
./infra/scripts/add-module.sh --name <module-name> --description <brief-module-description> [--provider <provider>]
```

Parameters explained:
- `--name`: Required. The name of your module (e.g., `azure_api_management`)
- `--description`: Required. A brief description of the module's objective (e.g., `Deploys an Azure API Management service with monitoring and network configuration`)
- `--provider`: Optional. Defaults to `azurerm`. Specifies the cloud provider (e.g., `aws`, `azurerm`)

### What the Initialization Script Does

The script performs several important steps:

1. Validates if the module directory already exists to prevent accidental overwrites
2. Creates the module directory structure under `infra-modules/<provider_name>/`
3. Generates a `package.json` file for version management
4. Creates or updates (if already exists) a dedicated sub-repository with Terraform Registry compliant naming and description
5. Initializes the repository with the module's base code

After successful initialization, you'll need to:
1. Start developing you module
2. Create a changeset to produce the first release

### Adding the Module to the Terraform Registry

After completing all previous steps and ensuring that the module has been pushed to its sub-repository:

1. **Ensure the Tag Exists**  
   Before proceeding, merge the changeset Pull Request titled **"Version packages"** into the main branch of the sub-repository.  
   - This step is essential because the Terraform Registry requires at least one version tag (`X.Y.Z`) for the module to be listed and published.

2. **Access the Terraform Registry**  
   Use the `dx-pagopa-bot` to log in to [registry.terraform.io](https://registry.terraform.io).

3. **Add the Repository**  
   - Click **Publish** => **Module**.
   - Select the **GitHub repository** corresponding to the module (e.g., `terraform-azurerm-azure-api-management`).
   - Confirm the repository settings.

4. **Verify Publication**  
   Once added, the module will be scanned by the Terraform Registry. Ensure that the module appears in the PagoPA namespace with the correct version and documentation.

## Best Practices and Tips

- Always create a changeset for any meaningful code changes
- Provide clear, descriptive changelog messages that help users understand the impact of changes
- Test your modules thoroughly before publishing
- Keep module documentation up to date with any changes
- Follow the established naming conventions for consistency

## Next Steps

After successfully publishing your module:
- Monitor the GitHub Actions workflow for successful completion
- Verify the module's version is correctly listed in the Terraform Registry
- Update any dependent infrastructure code to use the new version

For additional help or questions, reach out to the DevEx team.