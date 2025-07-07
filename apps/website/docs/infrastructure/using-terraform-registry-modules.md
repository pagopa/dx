---
sidebar_position: 2
---

# Using DX Terraform Modules

The Terraform Registry serves as a central repository for discovering, sharing,
and managing infrastructure modules. PagoPA maintains its own collection of
modules in our dedicated namespace at
[registry.terraform.io/namespaces/pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx),
making it easier for teams to share and reuse infrastructure components.

:::note

This documentation is relevant for all individual contributors making use of
DevEx terraform modules.

:::

## Why Use the DX Registry?

We've enhanced our DX pipelines (plan and apply) to support direct module
references from the Terraform Registry. This approach offers several significant
advantages over traditional GitHub source references.

### Semantic Versioning Benefits

When you use Registry modules, you gain the power of semantic versioning, which
provides a clear contract for module updates. This versioning system helps you:

- Confidently upgrade modules within the same minor version, knowing that
  breaking changes won't occur
- Easily identify when major changes require careful migration planning
- Reduce the time spent on refactoring during module updates
- Track dependencies more effectively across your infrastructure code

### Enhanced Documentation Access

The Registry provides a professional, centralized interface where you can:

- Browse comprehensive module documentation
- Review input and output variable specifications
- Find usage examples and requirements
- Access version histories and change logs

This centralization eliminates the need to navigate multiple GitHub repositories
or documentation sources, making it faster and easier to implement modules
correctly.

## Security Implementation

To maintain our security standards while leveraging Registry modules, we've
implemented an automated pre-commit system that generates lock files for all
Terraform configurations. This system works similarly to provider locks,
ensuring that your infrastructure deployments remain consistent and secure.

### Setting Up Module Locking

Follow these steps to implement module locking in your repository:

1. First, create or update the `.pre-commit-config.yaml` file in your
   repository's root directory:

```yaml
repos:
  - repo: https://github.com/pagopa/dx
    rev: pre_commit_scripts@0.0.1
    hooks:
      - id: lock_modules
        exclude: ^.*/(_modules|modules|\.terraform)(/.*)?$
        # Configure the paths to your Terraform configurations
        files: src/(common|core|github_runner|identity|migration|repository)
```

2. Customize the `files` parameter to match your repository's structure. This
   parameter should list all directories containing Terraform configurations.
   For example, if your configurations are in `src/prod` and `src/dev`, you
   would use:

```yaml
files: src/(prod|dev)
```

3. Generate the initial set of module lock files. You have two options:

   **Option 1**: Run the pre-commit hook manually

   ```bash
   pre-commit run -a
   ```

   **Option 2**: Install the pre-commit hook for automatic execution

   ```bash
   pre-commit install
   ```

4. After generating the lock files, commit them to your repository. These files
   are essential for pipeline operation.

:::note

The second option enables automatic execution of pre-commit checks on every
push. If this disrupts your workflow, you can disable it by following
[these instructions](#disabling-automatic-pre-commits) and opt for the first
option instead.

:::

## Pipeline Integration

The DX pipelines now include verification steps that check module lock files
before executing any plan or apply operations. Here's what you need to know:

- Every Terraform configuration must have corresponding lock files
- Lock files must be up to date with your module versions
- Pipelines will fail if lock files are missing or inconsistent
- Lock files must be regenerated when updating module versions

## Migrating to Registry Modules

When transitioning from GitHub-sourced modules to Terraform Registry modules,
you'll need to update your module source declarations.

### Source Declaration Changes

Here's a before and after example:

**Before (GitHub source):**

```hcl
module "roles" {
  source       = "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main"
  principal_id = var.data_factory_principal_id

  cosmos = [
    {
      account_name        = var.cosmos_accounts.source.name
      resource_group_name = var.cosmos_accounts.source.resource_group_name
      role                = "reader"
    }
  ]
}
```

**After (Registry source):**

```hcl
module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.data_factory_principal_id

  cosmos = [
    {
      account_name        = var.cosmos_accounts.source.name
      resource_group_name = var.cosmos_accounts.source.resource_group_name
      role                = "reader"
    }
  ]
}
```

Let's break down the key changes:

1. **Source Format**
   - Old: `github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main`
   - New: `pagopa-dx/azure-role-assignments/azurerm`

   The Registry format follows the pattern: `<NAMESPACE>/<NAME>/<PROVIDER>`

2. **Version Specification**
   - Old: Using git ref (`?ref=main`)
   - New: Using semantic versioning (`version = "~> 0.0"`)

   The `~>` operator allows updates within the same major version, providing
   stability while allowing minor updates.

## Troubleshooting Common Issues

### Missing sha256sum dependency

If you encounter the following error while running the pre-commit hook:

`ERROR: Required command not found: sha256sum`

It means your system is missing the sha256sum dependency. You can resolve this
by installing it using:

`brew install coreutils`

### Pipeline Failures

If your pipeline fails with a module lock error:

1. Ensure all Terraform configuration directories are correctly listed in
   `.pre-commit-config.yaml`
2. Run `pre-commit run -a` to generate missing lock files
3. Commit and push the new lock files
4. Retry the pipeline

### Disabling automatic Pre-Commits

If you need to temporarily disable pre-commit hooks, you can do so by running:

`pre-commit uninstall`

This will remove the installed pre-commit hooks from your repository. You can
reinstall them later using:

`pre-commit install`

### Lock File Generation Issues

If you encounter problems generating lock files:

1. Verify that your module source references are correct
2. Ensure your pre-commit hook is properly configured
3. Clear your local Terraform cache if needed

:::info

For more details on how to configure and use pre-commit hooks with
Terraform and solve eventual issues during module/provider upgrades, see the [dedicated documentation](./pre-commit-terraform.md).

:::

## Getting Support

The DevEx team is here to help you successfully implement and use Registry
modules. If you encounter any challenges:

- Join the `#team_devex_help` channel for direct support
- Provide specific error messages or pipeline logs when seeking help
- Share your repository structure and Terraform configuration paths

Remember, these changes are designed to enhance our infrastructure management
while maintaining security. Don't hesitate to reach out for assistance as you
implement these new requirements.
