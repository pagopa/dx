# Unit Tests (unit.tftest.hcl)

**Purpose**: Verify module logic, computations, and default behaviors without provisioning resources.

## Key Patterns

- Use `mock_provider "azurerm" {}` or equivalent for the cloud provider
- Define shared `variables {}` block at the top with common test inputs
- Use `override_data {}` blocks to mock data source responses
- All tests use `command = plan`
- Test multiple scenarios by overriding specific variables in each `run` block
- Use descriptive test names like `module_name_feature_being_tested`

## Variable Reuse Pattern

```hcl
variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
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
    TestName       = "<Module Name> unit tests"
  }

  // Required module inputs with sensible defaults
  resource_group_name = "rg-test"
  // ... other common inputs
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_private_dns_zone.example
  values = {
    id   = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.example.azure.com"
    name = "privatelink.example.azure.com"
  }
}

run "module_basic_behavior" {
  command = plan

  assert {
    condition     = azurerm_resource.this.property == "expected_value"
    error_message = "Property must be expected_value when using defaults"
  }
}

run "module_custom_config" {
  command = plan
  variables {
    custom_setting = "custom_value"
  }

  assert {
    condition     = azurerm_resource.this.custom_property == "custom_value"
    error_message = "Custom property must be set correctly"
  }
}
```

## What to Test

- Default values and behaviors
- Conditional logic (count, for_each conditions)
- Local variable computations
- Resource property mappings
- Different use cases and configurations
- SKU/tier selection logic
- Feature flags and toggles
