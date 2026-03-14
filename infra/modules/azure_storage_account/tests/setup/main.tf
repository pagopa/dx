locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  # Resolves names of shared pre-provisioned test infrastructure.
  # The test infra is named using test_kind ("integration") as the app name
  # and an empty domain, following the pagopa-dx naming convention.
  existing_resources = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = "",
    name            = var.test_kind,
    instance_number = tonumber(var.environment.instance_number),
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group", name = "network" }))
}

data "azurerm_virtual_network" "vnet" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "virtual_network" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

data "azurerm_subnet" "pep" {
  name                 = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "subnet", name = "pep" }))
  resource_group_name  = data.azurerm_resource_group.test.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
}

data "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = data.azurerm_resource_group.network.name
}

# Resource group created for the System Under Test (SUT).
resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = var.environment.location
  tags     = var.tags
}

# Generate a random base instance number tied to the current timestamp.
# Using timestamp() as a keeper forces regeneration on every test execution,
# ensuring test runs are isolated from each other even when state is reused.
# The base range (10-24) guarantees that all 4 derived instance numbers
# (base, base+25, base+50, base+75) stay within the valid 2-digit range (10-99).
resource "random_integer" "instance_base" {
  min = 10
  max = 24
  keepers = {
    run_timestamp = timestamp()
  }
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "private_dns_zone_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "virtual_network" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_resource_group.network.name
  }
}

# Map of unique instance numbers per integration scenario.
# Each scenario gets an offset to avoid name collisions when run in parallel.
output "instance_numbers" {
  value = {
    default          = tostring(random_integer.instance_base.result)
    development      = tostring(random_integer.instance_base.result + 25)
    delegated_access = tostring(random_integer.instance_base.result + 50)
    public_network   = tostring(random_integer.instance_base.result + 75)
  }
}

output "tags" {
  value = var.tags
}
