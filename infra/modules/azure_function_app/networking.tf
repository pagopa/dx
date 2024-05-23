resource "azurerm_private_endpoint" "st_blob" {
  name                = "${local.project}-${var.environment.domain}-${var.environment.app_name}-blob-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.project}-${var.environment.domain}-${var.environment.app_name}-blob-pep-${var.environment.instance_number}"
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

resource "azurerm_private_endpoint" "st_file" {
  name                = "${local.project}-${var.environment.domain}-${var.environment.app_name}-file-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.project}-${var.environment.domain}-${var.environment.app_name}-file-pep-${var.environment.instance_number}"
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

resource "azurerm_private_endpoint" "st_queue" {
  name                = "${local.project}-${var.environment.domain}-${var.environment.app_name}-queue-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.project}-${var.environment.domain}-${var.environment.app_name}-queue-pep-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_queue.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "function_sites" {
  name                = "${local.project}-${var.environment.domain}-${var.environment.app_name}-func-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.project}-${var.environment.domain}-${var.environment.app_name}-func-pep-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.function_app.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "staging_function_sites" {
  count = local.function_app.is_slot_enabled

  name                = "${local.project}-${var.environment.domain}-${var.environment.app_name}-staging-func-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.project}-${var.environment.domain}-${var.environment.app_name}-staging-func-pep-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites-${azurerm_linux_function_app_slot.this[0].name}"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.function_app.id]
  }

  tags = var.tags
}

