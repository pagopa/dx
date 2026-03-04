# Examples Structure (for E2E Tests)

E2E tests deploy from `examples/` directories. Each example must contain two key files: `fixtures.tf` and `mut.tf`.

## fixtures.tf

Contains supporting infrastructure for the E2E test:

- Resource groups
- Test applications (Azure Container Instances)
- Network resources (subnets for containers)
- IAM role assignments
- Any auxiliary resources needed by the test

**Important**: Resources like Key Vault that use soft delete **must use random instance numbers**:

```hcl
resource "random_integer" "instance_number" {
  min = 1
  max = 99
}

resource "azurerm_key_vault" "kv" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    resource_type   = "key_vault"
    instance_number = random_integer.instance_number.result
  }))
  # ... other config
}
```

## mut.tf (Module Under Test)

Contains the module being tested:

```hcl
module "example" {
  # During test development, use local reference:
  source = "../.."  # Points to module root

  # Before commit, update to registry version + 1:
  # source  = "pagopa-dx/azure-<service>/azurerm"
  # version = "~> X.Y"  # Next version after bump

  environment = local.environment
  # ... module inputs
}
```

**Critical**: When committing tests for a module:

1. Update `mut.tf` to reference the module from the registry with version + 1
2. Run `pnpm changeset` and create a **patch** version bump
3. The changeset ensures the version referenced in tests will exist after publish
