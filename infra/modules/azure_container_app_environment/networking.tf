resource "azurerm_subnet" "this" {
  count = local.has_existing_subnet ? 0 : 1

  name                 = "${module.naming_convention.prefix}-cae-snet-${module.naming_convention.suffix}"
  virtual_network_name = data.azurerm_virtual_network.this[0].name
  resource_group_name  = data.azurerm_virtual_network.this[0].resource_group_name
  address_prefixes     = [var.subnet_cidr]

  delegation {
    name = "Microsoft.App/environments"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_endpoint" "this" {
  name                = "${module.naming_convention.prefix}-cae-pep-${module.naming_convention.suffix}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${module.naming_convention.prefix}-cae-pep-${module.naming_convention.suffix}"
    private_connection_resource_id = azurerm_container_app_environment.this.id
    is_manual_connection           = false
    subresource_names              = ["managedEnvironments"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.this.id]
  }

  tags = var.tags
}