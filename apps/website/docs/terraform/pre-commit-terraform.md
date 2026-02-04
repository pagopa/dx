---
sidebar_position: 3
sidebar_label: Configuring pre-commit hooks for Terraform
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
       # Ensures provider lock files are compatible with all supported architectures
       - id: terraform_providers_lock_staged
       # Locks Terraform Registry modules and maintains hashes
       - id: lock_modules
         exclude: ^.*/(_modules|modules|\.terraform)(/.*)?$
         files: infra/(github_runner|identity/dev|repository|resources/dev)
   - repo: https://github.com/antonbabenko/pre-commit-terraform
     rev: v1.102.0
     hooks:
       # Format all Terraform files according to the standard style
       - id: terraform_fmt

       # Auto-generate README.md in local modules
       - id: terraform_docs
         name: terraform_docs on modules
         args:
           - --hook-config=--create-file-if-not-exist=true
           - --args=--hide providers
           - --args=--lockfile=false
         files: ^infra/(?:.*/)?_?modules/.*

       # Auto-generate README.md for root modules (resources)
       - id: terraform_docs
         name: terraform_docs on resources
         args:
           - --hook-config=--create-file-if-not-exist=true
         exclude: |
           (?x)^(
             infra/modules/.*?|
             infra\/(?:.*\/)_?modules\/.*|
             providers\/.*
             )$

       # Lint Terraform code for best practices
       - id: terraform_tflint
         args:
           # Versions are managed per-resource, not globally
           - --args=--disable-rule terraform_required_version
           # Providers are context-dependent
           - --args=--disable-rule terraform_required_providers
           - --args=--config=__GIT_WORKING_DIR__/.tflint.hcl
         exclude: ^providers/.*

       # Validate Terraform syntax and configuration
       - id: terraform_validate
         args:
           - --args=-json
           - --args=-no-color
           - --hook-config=--retry-once-with-cleanup=true
         exclude: ^providers/.*|.*/examples?(/|$)

       # Security scan for vulnerabilities in Terraform
       - id: terraform_trivy
         args:
           - --args=--skip-dirs="**/.terraform"
           - --args=--skip-dirs="**/tests/apps/network_access"
           - --args=--ignorefile=__GIT_WORKING_DIR__/.trivyignore
           - --args=--tf-exclude-downloaded-modules
           # Limit parallelism to avoid race condition errors
           - --hook-config=--parallelism-limit=1
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

:::tip **Need Help?**

For support with pre-commit hooks or Registry modules, visit our
[support page](../support.md).

:::
