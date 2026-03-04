# Integration Tests (integration.tftest.hcl)

**Purpose**: Provision real infrastructure to verify module creates resources correctly in isolation.

## Key Patterns

- Use real providers (no mocks)
- First `run` block is always "setup" that calls `./tests/setup` module
- Use `command = apply` to provision resources
- Reference setup outputs: `run.setup.resource_group_name`
- Test multiple scenarios with different configurations
- Clean naming to avoid conflicts: `merge(var.environment, { app_name = "unique-suffix" })`
- **Use "int" (not "integration") in domain names** due to Azure resource name length limits
- Integration infrastructure is separate from E2E infrastructure

## Example

```hcl
provider "azurerm" {
  features {}
}

provider "pagopa-dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"  # Use "int" not "integration" for name length limits
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/<module_name>/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "<Module Name> integration tests"
  }

  use_case  = "default"
  test_kind = "integration"
}

run "setup" {
  module {
    source = "./tests/setup"
  }
  variables {
    environment = var.environment
    test_kind   = var.test_kind
    tags        = var.tags
  }
}

run "apply_default" {
  command = apply
  variables {
    environment         = var.environment
    tags                = var.tags
    resource_group_name = run.setup.resource_group_name
    virtual_network     = run.setup.virtual_network
    subnet_pep_id       = run.setup.subnet_pep_id
    // ... other inputs from setup
  }

  assert {
    condition     = azurerm_resource.this.property == "expected"
    error_message = "Property must be set correctly"
  }
}

run "apply_custom_config" {
  command = apply
  variables {
    environment         = merge(var.environment, { app_name = "custom" })
    tags                = var.tags
    resource_group_name = run.setup.resource_group_name
    custom_setting      = "custom_value"
    // ... other inputs
  }

  assert {
    condition     = azurerm_resource.this.custom_property == "custom_value"
    error_message = "Custom configuration must be applied"
  }
}
```

## What to Test

- Resource creation with default configuration
- Resource creation with custom configurations
- Resource properties are set correctly
- Dependencies are created in correct order
- Tags are applied correctly
- Monitoring/alerting resources are created
- IAM roles are assigned
- Network configurations (private endpoints, etc.)
- Integration with other Azure services
