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

data "azurerm_private_dns_zone" "tests_peps" {
  count = length(local.private_dns_zones)

  name                = local.private_dns_zones[count.index]
  resource_group_name = data.azurerm_virtual_network.common.resource_group_name
}
