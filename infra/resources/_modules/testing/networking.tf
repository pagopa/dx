resource "azurerm_virtual_network" "tests" {
  for_each = var.test_modes

  name = provider::dx::resource_name(
    merge(
      var.environment, {
        resource_type = "virtual_network",
        name          = each.value
      }
  ))
  location            = data.azurerm_resource_group.tests[each.value].location
  resource_group_name = data.azurerm_resource_group.tests[each.value].name
  address_space       = [format("10.%d.0.0/16", 20 + index(tolist(var.test_modes), each.key))]

  tags = var.tags
}

resource "dx_available_subnet_cidr" "pep_snet_cidrs" {
  for_each = var.test_modes

  virtual_network_id = azurerm_virtual_network.tests[each.value].id
  prefix_length      = 23
}

resource "azurerm_subnet" "pep_snets" {
  for_each = var.test_modes

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

resource "azurerm_virtual_network_peering" "common_to_tests" {
  for_each = var.test_modes

  name                      = "${var.vnet_common.name}-to-${azurerm_virtual_network.tests[each.value].name}"
  resource_group_name       = var.vnet_common.resource_group_name
  virtual_network_name      = var.vnet_common.name
  remote_virtual_network_id = azurerm_virtual_network.tests[each.value].id

  local_subnet_names = ["dx-d-itn-github-runner-snet-01"]
}

resource "azurerm_virtual_network_peering" "tests_to_common" {
  for_each = var.test_modes

  name = "${azurerm_virtual_network.tests[each.value].name}-to-${var.vnet_common.name}"

  resource_group_name       = azurerm_virtual_network.tests[each.value].resource_group_name
  virtual_network_name      = azurerm_virtual_network.tests[each.value].name
  remote_virtual_network_id = var.vnet_common.id

  allow_virtual_network_access = false
  allow_forwarded_traffic      = false
  allow_gateway_transit        = false
  use_remote_gateways          = false
}
