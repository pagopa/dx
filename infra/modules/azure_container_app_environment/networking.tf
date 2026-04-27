resource "dx_available_subnet_cidr" "cae_subnet" {
  virtual_network_id = local.vnet_id
  prefix_length      = local.use_case_features.cae_subnet_prefix_length
}

resource "azurerm_subnet" "this" {
  name                 = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_subnet" }))
  virtual_network_name = local.vnet_name
  resource_group_name  = local.vnet_resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.cae_subnet.cidr_block]

  delegation {
    name = "Microsoft.App/environments"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_endpoint" "this" {
  count = var.networking.public_network_access_enabled ? 0 : 1

  name                = local.pep_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = local.subnet_pep_id

  private_service_connection {
    name                           = local.pep_name
    private_connection_resource_id = azurerm_container_app_environment.this.id
    is_manual_connection           = false
    subresource_names              = ["managedEnvironments"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.private_dns_zone_id]
  }

  tags = local.tags
}
