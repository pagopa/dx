resource "azurerm_public_ip" "this" {
  count = local.use_cases[var.use_case].vpn_connections_number
  name = provider::azuredx::resource_name(merge(local.naming_config, {
    name          = "${local.naming_config.name}-${count.index + 1}"
    resource_type = "public_ip"
  }))
  location            = var.azure.location
  resource_group_name = var.azure.resource_group_name
  allocation_method   = "Static"
  tags                = var.tags
}

resource "time_sleep" "wait_public_ips" {
  depends_on      = [azurerm_public_ip.this]
  create_duration = "30s"
}

resource "azurerm_virtual_network_gateway" "this" {
  count = var.azure.vpn.virtual_network_gateway_id == null ? 1 : 0
  name = provider::azuredx::resource_name(merge(local.naming_config, {
    resource_type = "virtual_network_gateway"
  }))
  location            = var.azure.location
  resource_group_name = var.azure.resource_group_name

  type          = "Vpn"
  vpn_type      = "RouteBased"
  active_active = local.use_cases[var.use_case].vpn_connections_number > 1 ? true : false
  enable_bgp    = true
  sku           = "VpnGw2"
  generation    = "Generation2"

  dynamic "ip_configuration" {
    for_each = azurerm_public_ip.this

    content {
      name                          = "vpnConfig${ip_configuration.key + 1}"
      public_ip_address_id          = azurerm_public_ip.this[ip_configuration.key].id
      private_ip_address_allocation = "Dynamic"
      subnet_id                     = var.azure.vpn_snet_id
    }
  }

  bgp_settings {
    asn = local.aws.bgp_asn

    dynamic "peering_addresses" {
      for_each = azurerm_public_ip.this

      content {
        ip_configuration_name = "vpnConfig${peering_addresses.key + 1}"
        apipa_addresses = [
          cidrhost(local.aws.inside_cidrs[peering_addresses.key][0], 2),
          cidrhost(local.aws.inside_cidrs[peering_addresses.key][1], 2)
        ]
      }
    }
  }
  tags = var.tags
}

resource "azurerm_local_network_gateway" "tunnel1" {
  count = local.use_cases[var.use_case].vpn_connections_number
  name = provider::azuredx::resource_name(merge(local.naming_config, {
    name          = "${local.naming_config.name}-${count.index + 1}-tunnel-1"
    resource_type = "local_network_gateway"
  }))
  location            = var.azure.location
  resource_group_name = var.azure.resource_group_name
  gateway_address     = aws_vpn_connection.this[count.index].tunnel1_address

  bgp_settings {
    asn                 = local.azure.bgp_asn
    bgp_peering_address = cidrhost(local.aws.inside_cidrs[count.index][0], 1)
  }

  tags = var.tags
}
resource "azurerm_local_network_gateway" "tunnel2" {
  count = local.use_cases[var.use_case].vpn_connections_number
  name = provider::azuredx::resource_name(merge(local.naming_config, {
    name          = "${local.naming_config.name}-${count.index + 1}-tunnel-2"
    resource_type = "local_network_gateway"
  }))
  location            = var.azure.location
  resource_group_name = var.azure.resource_group_name
  gateway_address     = aws_vpn_connection.this[count.index].tunnel2_address

  bgp_settings {
    asn                 = local.azure.bgp_asn
    bgp_peering_address = cidrhost(local.aws.inside_cidrs[count.index][1], 1)
  }

  tags = var.tags
}

resource "azurerm_virtual_network_gateway_connection" "tunnel1" {
  count = local.use_cases[var.use_case].vpn_connections_number
  name = provider::azuredx::resource_name(merge(local.naming_config, {
    name          = "${local.naming_config.name}-${count.index + 1}-tunnel-1"
    resource_type = "virtual_network_gateway_connection"
  }))
  location            = var.azure.location
  resource_group_name = var.azure.resource_group_name

  type                       = "IPsec"
  virtual_network_gateway_id = var.azure.vpn.virtual_network_gateway_id == null ? azurerm_virtual_network_gateway.this[0].id : var.azure.vpn.virtual_network_gateway_id
  local_network_gateway_id   = azurerm_local_network_gateway.tunnel1[count.index].id
  shared_key                 = aws_vpn_connection.this[count.index].tunnel1_preshared_key
  enable_bgp                 = true

  tags = var.tags
}

resource "azurerm_virtual_network_gateway_connection" "tunnel2" {
  count = local.use_cases[var.use_case].vpn_connections_number
  name = provider::azuredx::resource_name(merge(local.naming_config, {
    name          = "${local.naming_config.name}-${count.index + 1}-tunnel-2"
    resource_type = "virtual_network_gateway_connection"
  }))
  location            = var.azure.location
  resource_group_name = var.azure.resource_group_name

  type                       = "IPsec"
  virtual_network_gateway_id = var.azure.vpn.virtual_network_gateway_id == null ? azurerm_virtual_network_gateway.this[0].id : var.azure.vpn.virtual_network_gateway_id
  local_network_gateway_id   = azurerm_local_network_gateway.tunnel2[count.index].id
  shared_key                 = aws_vpn_connection.this[count.index].tunnel2_preshared_key
  enable_bgp                 = true

  tags = var.tags
}
