resource "azurerm_subnet" "this" {
  name                 = "${local.project}-${var.domain}-${var.app_name}-snet-${var.instance_number}"
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  address_prefixes     = [var.subnet_cidr]

  delegation {
    name = "default"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }

  service_endpoints = [
    "Microsoft.Web",
    # "Microsoft.Storage"
  ]
}

resource "azurerm_private_endpoint" "blob" {
  name                = "${local.project}-${var.domain}-${var.app_name}-pep-blob-${var.instance_number}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = "${local.project}-${var.domain}-${var.app_name}-pep-blob-${var.instance_number}"
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_blob.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "file" {
  name                = "${local.project}-${var.domain}-${var.app_name}-pep-blob-${var.instance_number}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = "${local.project}-${var.domain}-${var.app_name}-pep-file-${var.instance_number}"
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_file.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "function_sites" {
  name                = "${local.project}-${var.domain}-${var.app_name}-pep-func-${var.instance_number}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = "${local.project}-${var.domain}-${var.app_name}-pep-func-${var.instance_number}"
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_file.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "staging_function_sites" {
  name                = "${local.project}-${var.domain}-${var.app_name}-pep-staging-func-${var.instance_number}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = "${local.project}-${var.domain}-${var.app_name}-pep-staging-func-${var.instance_number}"
    private_connection_resource_id = azurerm_linux_function_app_slot.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_file.id]
  }

  tags = var.tags
}

