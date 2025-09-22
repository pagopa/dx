resource "dx_available_subnet_cidr" "pep_cidr" {
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 23
}

resource "dx_available_subnet_cidr" "runner_cidr" {
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 23

  depends_on = [azurerm_subnet.pep_snet]
}

resource "dx_available_subnet_cidr" "vpn_cidr" {
  count              = var.vpn_enabled == true ? 1 : 0
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 24

  depends_on = [azurerm_subnet.runner_snet]
}

resource "dx_available_subnet_cidr" "dns_forwarder_cidr" {
  count              = var.vpn_enabled == true ? 1 : 0
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 29

  depends_on = [azurerm_subnet.vpn_snet]
}

resource "dx_available_subnet_cidr" "test_cidr" {
  count              = var.test_enabled == true ? 1 : 0
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 24

  depends_on = [azurerm_subnet.dns_forwarder_snet]
}

resource "azurerm_subnet" "pep_snet" {
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "pep",
      resource_type = "subnet",
  }))
  virtual_network_name = azurerm_virtual_network.vnet.name
  resource_group_name  = var.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.pep_cidr.cidr_block] #[module.cidrs.network_cidr_blocks.pep]
}

resource "azurerm_subnet" "test_snet" {
  count = var.test_enabled == true ? 1 : 0
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "test",
      resource_type = "subnet",
  }))
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.test_enabled ? dx_available_subnet_cidr.test_cidr[0].cidr_block : null] #[var.test_enabled ? module.cidrs.network_cidr_blocks.test : null]
  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "runner_snet" {
  name = provider::dx::resource_name(merge(var.naming_config, {
    name          = "github-runner",
    resource_type = "subnet",
  }))
  virtual_network_name = azurerm_virtual_network.vnet.name
  resource_group_name  = var.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.runner_cidr.cidr_block]
}

resource "azurerm_subnet" "vpn_snet" {
  count = var.vpn_enabled == true ? 1 : 0

  name                 = "GatewaySubnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.vpn_cidr[0].cidr_block]
  service_endpoints    = []
}

resource "azurerm_subnet" "dns_forwarder_snet" {
  count = var.vpn_enabled == true ? 1 : 0

  name                 = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-dns-forwarder-snet-01"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.dns_forwarder_cidr[0].cidr_block]

  delegation {
    name = "delegation"

    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}