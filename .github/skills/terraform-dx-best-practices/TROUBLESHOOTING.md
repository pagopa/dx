# Terraform Troubleshooting

## Pre-commit Issues

### Missing sha256sum

**Error**: `ERROR: Required command not found: sha256sum`

**Solution** (macOS):

```bash
brew install coreutils
```

### Lock File Generation Fails

1. Clear local cache:

   ```bash
   rm -rf .terraform
   terraform init
   ```

2. Regenerate provider locks:

   ```bash
   terraform providers lock \
     -platform=windows_amd64 \
     -platform=darwin_amd64 \
     -platform=darwin_arm64 \
     -platform=linux_amd64
   ```

## Pipeline Failures

### Module Lock Error

1. Ensure all Terraform directories are listed in `.pre-commit-config.yaml`
2. Regenerate lock files:

   ```bash
   pre-commit run -a
   ```

3. Commit the updated lock files
4. Retry the pipeline

### Static Analysis Fails

Run the pre-commit hooks to automatically fix formatting and validate syntax:

**If files are already staged:**

```bash
pre-commit run
```

**If you want to check specific files:**

```bash
pre-commit run --files infra/resources/**/*.tf
```

This will:

- Format code with `terraform fmt`
- Validate Terraform syntax
- Update and format the documentation
- Run tflint and report any violations

## Module Upgrade Issues

When updating module versions:

```bash
terraform init -upgrade
```

**Never manually edit** `.terraform.lock.hcl` files.

## Common Errors

### Provider Authentication

Ensure GitHub secrets are configured:

- `ARM_SUBSCRIPTION_ID`
- `ARM_TENANT_ID`
- `ARM_CLIENT_ID`

### Missing Required Variables

DX modules require specific variables. Common missing ones:

- `environment` - The naming configuration object
- `tags` - Resource tags map
