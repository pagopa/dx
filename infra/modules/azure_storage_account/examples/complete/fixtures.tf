# Infrastructure prerequisites (data sources and supporting resources)
# that the module under test (mut.tf) depends on.

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.environment, {
    domain        = null,
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_virtual_network" "common" {
  name                = local.virtual_network.name
  resource_group_name = local.virtual_network.resource_group_name
}

resource "dx_available_subnet_cidr" "example" {
  virtual_network_id = data.azurerm_virtual_network.common.id
  prefix_length      = 24
}

resource "azurerm_resource_group" "example" {
  name     = provider::dx::resource_name(merge(local.environment, { resource_type = "resource_group" }))
  location = local.environment.location
}

resource "azurerm_subnet" "example" {
  name                 = "example-subnet"
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.example.cidr_block]
}
