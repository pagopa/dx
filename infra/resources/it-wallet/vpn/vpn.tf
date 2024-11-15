module "vpn_snet" {
  source                                    = "github.com/pagopa/terraform-azurerm-v3//subnet?ref=v8.33.1"
  name                                      = "GatewaySubnet"
  address_prefixes                          = ["10.2.252.8/29"]
  resource_group_name                       = "${local.project}-networking-rg-01"
  virtual_network_name                      = "${local.project}-vnet-01"
  service_endpoints                         = []
  private_endpoint_network_policies_enabled = false
}

module "vpn" {
  source = "github.com/pagopa/terraform-azurerm-v3//vpn_gateway?ref=v8.33.0"

  name                = "${local.project}-vgw-01"
  location            = "italynorth"
  resource_group_name = "${local.project}-networking-rg-01"
  sku                 = "VpnGw1"
  pip_sku             = "Basic"
  subnet_id           = module.vpn_snet.id

  vpn_client_configuration = [
    {
      address_space         = ["172.16.2.0/24"],
      vpn_client_protocols  = ["OpenVPN"],
      aad_audience          = data.azuread_application.vpn_app_01.client_id
      aad_issuer            = "https://sts.windows.net/${data.azurerm_subscription.current.tenant_id}/"
      aad_tenant            = "https://login.microsoftonline.com/${data.azurerm_subscription.current.tenant_id}"
      radius_server_address = null
      radius_server_secret  = null
      revoked_certificate   = []
      root_certificate      = []
    }
  ]

  tags = local.tags
}

module "dns_forwarder_snet" {
  source                                    = "github.com/pagopa/terraform-azurerm-v3//subnet?ref=v8.33.1"
  name                                      = "${local.project}-dns-forwarder-snet-01"
  address_prefixes                          = ["10.2.252.8/29"]
  resource_group_name                       = "${local.project}-networking-rg-01"
  virtual_network_name                      = "${local.project}-vnet-01"
  private_endpoint_network_policies_enabled = false

  delegation = {
    name = "delegation"
    service_delegation = {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

module "dns_forwarder" {
  source              = "github.com/pagopa/terraform-azurerm-v3//dns_forwarder?ref=v8.33.1"
  name                = "${local.project}-dns-forwarder-ci-01"
  location            = "italynorth"
  resource_group_name = "${local.project}-networking-rg-01"
  subnet_id           = module.dns_forwarder_snet.id

  tags = local.tags
}
