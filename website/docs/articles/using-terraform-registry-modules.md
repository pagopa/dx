---
sidebar_label: Using Terraform Registry Modules
---

# Using Terraform Registry Modules

The Terraform Registry serves as a central repository for discovering, sharing, and managing infrastructure modules. PagoPA maintains its own collection of modules in our dedicated namespace at [registry.terraform.io/namespaces/pagopa](https://registry.terraform.io/namespaces/pagopa), making it easier for teams to share and reuse infrastructure components.

## Why Use the Registry?

We've enhanced our DX pipelines (plan and apply) to support direct module references from the Terraform Registry. This approach offers several significant advantages over traditional GitHub source references:

### Semantic Versioning Benefits

When you use Registry modules, you gain the power of semantic versioning, which provides a clear contract for module updates. This versioning system helps you:

- Confidently upgrade modules within the same minor version, knowing that breaking changes won't occur
- Easily identify when major changes require careful migration planning
- Reduce the time spent on refactoring during module updates
- Track dependencies more effectively across your infrastructure code

### Enhanced Documentation Access

The Registry provides a professional, centralized interface where you can:

- Browse comprehensive module documentation
- Review input and output variable specifications
- Find usage examples and requirements
- Access version histories and change logs

This centralization eliminates the need to navigate multiple GitHub repositories or documentation sources, making it faster and easier to implement modules correctly.

## Security Implementation

To maintain our security standards while leveraging Registry modules, we've implemented an automated pre-commit system that generates lock files for all Terraform configurations. This system works similarly to provider locks, ensuring that your infrastructure deployments remain consistent and secure.

### Setting Up Module Locking

Follow these steps to implement module locking in your repository:

1. First, create or update the `.pre-commit-config.yaml` file in your repository's root directory:

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

2. Customize the `files` parameter to match your repository's structure. This parameter should list all directories containing Terraform configurations. For example, if your configurations are in `src/prod` and `src/dev`, you would use:

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

4. After generating the lock files, commit them to your repository. These files are essential for pipeline operation.

## Pipeline Integration

The DX pipelines now include verification steps that check module lock files before executing any plan or apply operations. Here's what you need to know:

- Every Terraform configuration must have corresponding lock files
- Lock files must be up to date with your module versions
- Pipelines will fail if lock files are missing or inconsistent
- Lock files must be regenerated when updating module versions

## Troubleshooting Common Issues

### Pipeline Failures

If your pipeline fails with a module lock error:
1. Ensure all Terraform configuration directories are correctly listed in `.pre-commit-config.yaml`
2. Run `pre-commit run -a` to generate missing lock files
3. Commit and push the new lock files
4. Retry the pipeline

### Lock File Generation Issues

If you encounter problems generating lock files:
1. Verify that your module source references are correct
2. Ensure your pre-commit hook is properly configured
3. Clear your local Terraform cache if needed

## Getting Support

The DevEx team is here to help you successfully implement and use Registry modules. If you encounter any challenges:

- Join the `#team_devex_help` channel for direct support
- Provide specific error messages or pipeline logs when seeking help
- Share your repository structure and Terraform configuration paths

Remember, these changes are designed to enhance our infrastructure management while maintaining security. Don't hesitate to reach out for assistance as you implement these new requirements.