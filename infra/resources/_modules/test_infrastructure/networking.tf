resource "azurerm_virtual_network" "tests" {
  for_each = var.tests_kind

  name = provider::dx::resource_name(
    merge(
      var.environment, {
        resource_type = "virtual_network",
        name          = each.value
      }
  ))
  location            = azurerm_resource_group.tests[each.value].location
  resource_group_name = azurerm_resource_group.tests[each.value].name
  address_space       = [format("10.%d.0.0/16", 20 + index(tolist(var.tests_kind), each.key))]

  tags = var.tags
}

resource "dx_available_subnet_cidr" "pep_snet_cidrs" {
  for_each = var.tests_kind

  virtual_network_id = azurerm_virtual_network.tests[each.value].id
  prefix_length      = 23
}

resource "dx_available_subnet_cidr" "cae_snet_cidrs" {
  for_each = var.tests_kind

  virtual_network_id = azurerm_virtual_network.tests[each.value].id
  prefix_length      = 23
}

resource "azurerm_subnet" "pep_snets" {
  for_each = var.tests_kind

  name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "subnet",
        name          = "pep",
      }
  ))
  virtual_network_name = azurerm_virtual_network.tests[each.value].name
  resource_group_name  = azurerm_virtual_network.tests[each.value].resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.pep_snet_cidrs[each.value].cidr_block]
}

resource "azurerm_subnet" "cae_snets" {
  for_each = var.tests_kind

  name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "subnet",
        name          = "runner",
      }
  ))
  virtual_network_name = azurerm_virtual_network.tests[each.value].name
  resource_group_name  = azurerm_virtual_network.tests[each.value].resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.cae_snet_cidrs[each.value].cidr_block]
}
