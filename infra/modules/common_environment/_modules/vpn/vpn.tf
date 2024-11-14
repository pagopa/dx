## VPN

resource "azurerm_subnet" "vpn_snet" {
  name                 = "GatewaySubnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.virtual_network.name
  address_prefixes     = [var.vpn_cidr_subnet]
  service_endpoints    = []
}

module "vpn" {
  source = "github.com/pagopa/terraform-azurerm-v3//vpn_gateway?ref=v8.33.0"

  name                = "${var.project}-vgw-01"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "VpnGw1"
  pip_sku             = "Basic"
  subnet_id           = azurerm_subnet.vpn_snet.id

  vpn_client_configuration = [
    {
      address_space         = ["172.16.2.0/24"],
      vpn_client_protocols  = ["OpenVPN"],
      aad_audience          = data.azuread_application.vpn_app.object_id
      aad_issuer            = "https://sts.windows.net/${local.tenant_id}/"
      aad_tenant            = "https://login.microsoftonline.com/${local.tenant_id}"
      radius_server_address = null
      radius_server_secret  = null
      revoked_certificate   = []
      root_certificate      = []
    }
  ]

  tags = var.tags
}

## DNS FORWARDER
resource "azurerm_subnet" "dns_forwarder_snet" {
  name                 = "${var.project}-dns-forwarder-snet-01"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.virtual_network.name
  address_prefixes     = [var.dnsforwarder_cidr_subnet]

  delegation {
    name = "delegation"

    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

module "dns_forwarder" {
  source              = "github.com/pagopa/terraform-azurerm-v3//dns_forwarder?ref=v8.33.1"
  name                = "${var.project}-dns-forwarder-ci-01"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = azurerm_subnet.dns_forwarder_snet.id

  tags = var.tags
}