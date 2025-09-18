resource "azurerm_public_ip" "this" {
  count = local.use_cases[var.vpn_use_case].vpn_connections_number
  name = "${provider::dx::resource_name(merge(var.naming_config, {
    name          = "vpn"
    resource_type = "public_ip"
  }))}-${count.index + 1}"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  tags                = var.tags
}

resource "time_sleep" "wait_public_ips" {
  depends_on      = [azurerm_public_ip.this]
  create_duration = "30s"
}

resource "azurerm_virtual_network_gateway" "this" {
  name = provider::dx::resource_name(merge(var.naming_config, {
    name          = "vpn"
    resource_type = "virtual_network_gateway"
  }))
  location            = var.location
  resource_group_name = var.resource_group_name

  type          = "Vpn"
  vpn_type      = "RouteBased"
  active_active = local.use_cases[var.vpn_use_case].vpn_connections_number > 1 ? true : false
  enable_bgp    = var.cross_cloud_dns_enabled
  sku           = local.use_cases[var.vpn_use_case].sku
  generation    = "Generation${local.use_cases[var.vpn_use_case].generation}"

  dynamic "ip_configuration" {
    for_each = azurerm_public_ip.this

    content {
      name                          = "vpnConfig${ip_configuration.key + 1}"
      public_ip_address_id          = azurerm_public_ip.this[ip_configuration.key].id
      private_ip_address_allocation = "Dynamic"
      subnet_id                     = var.vpn_subnet_id
    }
  }

  dynamic "bgp_settings" {
    for_each = var.cross_cloud_dns_enabled ? [1] : []
    content {
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
  }

  dynamic "vpn_client_configuration" {
    for_each = var.vpn_enabled ? [1] : []
    content {
      aad_audience          = data.azuread_application.vpn_app.client_id
      aad_issuer            = "https://sts.windows.net/${var.tenant_id}/"
      aad_tenant            = "https://login.microsoftonline.com/${var.tenant_id}"
      address_space         = ["172.16.2.0/24"]
      radius_server_address = null
      radius_server_secret  = null
      vpn_client_protocols  = ["OpenVPN"]
    }
  }
  tags = var.tags
}
