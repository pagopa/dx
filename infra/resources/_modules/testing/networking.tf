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

locals {
  pep_subnet_name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "subnet",
        name          = "pep",
      }
  ))
}

resource "azurerm_subnet" "pep_snets" {
  for_each = var.test_modes

  name                 = local.pep_subnet_name
  virtual_network_name = azurerm_virtual_network.tests[each.value].name
  resource_group_name  = azurerm_virtual_network.tests[each.value].resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.pep_snet_cidrs[each.value].cidr_block]
}

locals {
  common_subnets = [var.runner_subnet_name]
  tests_subnets  = [local.pep_subnet_name] # same subnet name for both vnets
}

resource "azurerm_virtual_network_peering" "common_to_tests" {
  for_each = var.test_modes

  name                = "${var.vnet_common.name}-to-${azurerm_virtual_network.tests[each.value].name}"
  resource_group_name = var.vnet_common.resource_group_name

  virtual_network_name = var.vnet_common.name
  local_subnet_names   = local.common_subnets

  remote_virtual_network_id = azurerm_virtual_network.tests[each.value].id
  remote_subnet_names       = local.tests_subnets

  peer_complete_virtual_networks_enabled = false
  allow_virtual_network_access           = true

  triggers = {
    local_subnet_names  = join(",", local.common_subnets)
    remote_subnet_names = join(",", local.tests_subnets)
  }
}

resource "azurerm_virtual_network_peering" "tests_to_common" {
  for_each = var.test_modes

  name                = "${azurerm_virtual_network.tests[each.value].name}-to-${var.vnet_common.name}"
  resource_group_name = azurerm_virtual_network.tests[each.value].resource_group_name

  virtual_network_name = azurerm_virtual_network.tests[each.value].name
  local_subnet_names   = local.tests_subnets

  remote_virtual_network_id = var.vnet_common.id
  remote_subnet_names       = local.common_subnets

  peer_complete_virtual_networks_enabled = false
  allow_virtual_network_access           = false

  triggers = {
    local_subnet_names  = join(",", local.tests_subnets)
    remote_subnet_names = join(",", local.common_subnets)
  }
}

resource "azurerm_network_security_group" "common" {
  name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "network_security_group",
        name          = "common-vnet",
      }
  ))
  location            = var.environment.location
  resource_group_name = var.vnet_common.resource_group_name

  tags = var.tags
}

locals {
  subnet_names_by_id = { for subnet_id in var.vnet_common.subnet_ids : subnet_id => provider::azurerm::parse_resource_id(subnet_id)["resource_name"] }
  subnets_to_associate = {
    for subnet_id, subnet_name in local.subnet_names_by_id : subnet_id => subnet_name
    if !contains([var.runner_subnet_name, "GatewaySubnet"], subnet_name)
  }
}

resource "azurerm_subnet_network_security_group_association" "common_runner_to_tests_pep" {
  for_each = local.subnets_to_associate

  subnet_id                 = each.key
  network_security_group_id = azurerm_network_security_group.common.id
}

resource "azurerm_network_security_rule" "deny_common_to_tests_pep" {
  for_each = var.test_modes

  name      = "DenyToVNet${each.value}SubnetPep"
  priority  = tonumber(format("10%d", 0 + index(tolist(var.test_modes), each.key)))
  direction = "Outbound"
  access    = "Deny"

  protocol              = "*"
  source_port_range     = "*"
  source_address_prefix = "*"

  destination_port_range     = "*"
  destination_address_prefix = azurerm_subnet.pep_snets[each.value].address_prefixes[0]

  resource_group_name         = var.vnet_common.resource_group_name
  network_security_group_name = azurerm_network_security_group.common.name
}
