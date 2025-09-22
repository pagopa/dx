---
sidebar_position: 4
---

# Configuring pre-commit hooks for Terraform to ensure smooth module upgrades

This guide explains how to configure pre-commit hooks for Terraform projects,
why these hooks are important, and best practices for managing Terraform lock
files and modules.

## Why Use Pre-commit Hooks?

Pre-commit hooks help automate checks and enforce consistency before code is
committed. In the context of Terraform, they:

- Ensure lock files are up-to-date and compatible with supported architectures.
- Help avoid issues related to provider and module versions.

## How to Configure Pre-commit

1. **Install pre-commit** (if not already installed):

   ```sh
   pip install pre-commit
   ```

2. **Install the hooks**: From the root of your repository, run:

   ```sh
   pre-commit install --install-hooks
   ```

3. **Configure the hooks**: In the `dx` repository are defined two hooks for
   terraform:
   - `lock_modules`: Locks Terraform Registry modules and maintains hashes.
   - `terraform_providers_lock_staged`: Ensures provider lock files are
     consistent and compatible with all supported platforms (Windows, macOS,
     Linux, ARM).

   Example configuration in `.pre-commit-config.yaml`:

   ```yaml
   - repo: https://github.com/pagopa/dx
     rev: pre_commit_scripts@0.1.0
     hooks:
       - id: terraform_providers_lock_staged
       - id: lock_modules
         exclude: ^.*/(_modules|modules|\.terraform)(/.*)?$ # Directories to exclude from module locking
         files: infra/(github_runner|identity/dev|repository|resources/dev) # Directories to include for module locking
   ```

   > **Note:** These hooks are designed to avoid issues with lock files that are
   > not compatible with all architectures. Do not manually delete or edit
   > `.terraform.lock.hcl` files if is not necessary.

## Best Practices

- **Do not delete lock files**: Lock files ensure consistent provider versions
  across all environments. Deleting them can cause version mismatches and break
  deployments.

- **When updating modules**: If you change a module version or source, run:

  ```sh
  terraform init -upgrade
  ```

  This will update the modules and lock files as needed.

- **Do not manually edit lock files**: Always let Terraform and the pre-commit
  hooks manage them.

## Troubleshooting

If you encounter issues with the pre-commit hooks or Terraform lock files:

1. **Clean the Terraform cache**:

   ```sh
   rm -rf .terraform
   terraform init
   ```

2. **Re-run the provider lock** (if needed):

   ```sh
   terraform providers lock \
      -platform=windows_amd64 \
      -platform=darwin_amd64 \
      -platform=darwin_arm64 \
      -platform=linux_amd64
   ```

   This command is also used by the pre-commit hook to ensure compatibility
   across all platforms.

---

## Getting Support

The DevEx team is here to help you successfully implement and use Registry
modules. If you encounter any challenges:

- Join the `#team_devex_help` channel for direct support
- Provide specific error messages or pipeline logs when seeking help
- Share your repository structure and Terraform configuration paths

Remember, these changes are designed to enhance our infrastructure management
while maintaining security. Don't hesitate to reach out for assistance as you
implement these new requirements.
