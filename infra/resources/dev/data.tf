data "azurerm_virtual_network" "common" {
  name = provider::dx::resource_name(
    merge(
      local.environment,
      {
        resource_type = "virtual_network",
        name          = "common",
      }
  ))
  resource_group_name = provider::dx::resource_name(
    merge(
      local.environment,
      {
        resource_type = "resource_group",
        name          = "network",
      }
  ))
}

data "azurerm_subnet" "runner" {
  name = provider::dx::resource_name(
    merge(
      local.environment,
      {
        resource_type = "subnet",
        name          = "github-runner",
      }
  ))
  virtual_network_name = data.azurerm_virtual_network.common.name
  resource_group_name  = data.azurerm_virtual_network.common.resource_group_name
}

data "azurerm_subnet" "subnets" {
  count = length(data.azurerm_virtual_network.common.subnets)

  name                 = data.azurerm_virtual_network.common.subnets[count.index]
  virtual_network_name = data.azurerm_virtual_network.common.name
  resource_group_name  = data.azurerm_virtual_network.common.resource_group_name
}

data "azurerm_private_dns_zone" "tests_peps" {
  count = length(local.private_dns_zones)

  name                = local.private_dns_zones[count.index]
  resource_group_name = data.azurerm_virtual_network.common.resource_group_name
}

data "aws_caller_identity" "current" {}
