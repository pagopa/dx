# Setup Module (tests/setup/)

**Purpose**: Provision infrastructure needed **ONLY by integration tests**. E2E tests use fixtures in examples/ instead.

## Key Requirements

- Reuse existing test infrastructure from `infra/resources/_modules/testing`
- Minimize resource creation
- Output all values needed by integration tests
- Use `provider::dx::resource_name` for naming
- Test kind should be "integration" (use "int" in domain names)

## Structure

```bash
tests/setup/
├── main.tf         # Data sources and minimal resources
├── variables.tf    # Environment, tags, test_kind
├── outputs.tf      # All values needed by tests
├── providers.tf    # Provider requirements
└── README.md       # Terraform-docs generated
```

## main.tf Pattern

```hcl
locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

  existing_resources = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = ""
    name            = var.test_kind  // "integration"
    instance_number = tonumber(var.environment.instance_number)
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(
    local.existing_resources,
    { resource_type = "resource_group" }
  ))
}

data "azurerm_virtual_network" "vnet" {
  name                = provider::dx::resource_name(merge(
    local.existing_resources,
    { resource_type = "virtual_network" }
  ))
  resource_group_name = data.azurerm_resource_group.test.name
}

data "azurerm_subnet" "pep" {
  name                 = provider::dx::resource_name(merge(
    local.existing_resources,
    { resource_type = "subnet", name = "pep" }
  ))
  resource_group_name  = data.azurerm_resource_group.test.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
}

// Create resources only if they don't exist
// Use random suffixes to avoid naming conflicts
```

## variables.tf

```hcl
variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to setup resources"
}

variable "test_kind" {
  type        = string
  description = "Test type: integration (e2e tests don't use setup module)"
  validation {
    condition     = var.test_kind == "integration"
    error_message = "test_kind must be 'integration' (setup is not used by e2e tests)"
  }
}
```

## outputs.tf

```hcl
output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.test.name
}

output "virtual_network" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_resource_group.test.name
  }
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

// Add all outputs needed by the module under test
```
