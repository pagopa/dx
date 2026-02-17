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
  address_space       = [local.vnet_address_space_by_mode[each.key]]

  tags = var.tags
}

resource "dx_available_subnet_cidr" "pep_snet_cidrs" {
  for_each = var.test_modes

  virtual_network_id = azurerm_virtual_network.tests[each.value].id
  prefix_length      = 23
}

resource "azurerm_subnet" "pep_snets" {
  for_each = var.test_modes

  name                 = local.pep_subnet_name
  virtual_network_name = azurerm_virtual_network.tests[each.value].name
  resource_group_name  = azurerm_virtual_network.tests[each.value].resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.pep_snet_cidrs[each.value].cidr_block]
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

resource "azurerm_subnet_network_security_group_association" "common_runner_to_tests_pep" {
  for_each = local.subnets_to_associate

  subnet_id                 = each.key
  network_security_group_id = azurerm_network_security_group.common.id
}

resource "azurerm_network_security_rule" "deny_common_to_tests_vnets" {
  for_each = var.test_modes

  name      = "DenyToVNet${each.value}"
  priority  = tonumber(format("10%d", 0 + index(tolist(var.test_modes), each.key)))
  direction = "Outbound"
  access    = "Deny"

  protocol              = "*"
  source_port_range     = "*"
  source_address_prefix = "*"

  destination_port_range     = "*"
  destination_address_prefix = local.vnet_address_space_by_mode[each.key]

  resource_group_name         = var.vnet_common.resource_group_name
  network_security_group_name = azurerm_network_security_group.common.name
}

# For CDN module testing
module "cdn_origin_storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.environment
    location        = var.environment.location
    app_name        = "test"
    instance_number = "01"
  }

  resource_group_name = data.azurerm_resource_group.tests["integration"].name
  use_case            = "default"
  subnet_pep_id       = azurerm_subnet.pep_snets["integration"].id

  force_public_network_access_enabled = true

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = false
  }

  tags = var.tags
}

module "azure_cdn" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.4"

  resource_group_name = data.azurerm_resource_group.tests["integration"].name

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.environment
    location        = var.environment.location
    app_name        = "test"
    instance_number = "01"
  }

  origins = {
    primary = {
      host_name = module.cdn_origin_storage_account.primary_web_host
    }
  }

  tags = var.tags
}
