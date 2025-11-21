resource "azurerm_private_endpoint" "st_blob" {
  count = local.is_function_app ? 1 : 0

  name                = local.storage_account.pep_blob_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_blob_name
    private_connection_resource_id = azurerm_storage_account.this[0].id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.blob_private_dns_zone_id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_file" {
  count = local.is_function_app ? 1 : 0

  name                = local.storage_account.pep_file_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_file_name
    private_connection_resource_id = azurerm_storage_account.this[0].id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.file_private_dns_zone_id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_queue" {
  count = local.is_function_app ? 1 : 0

  name                = local.storage_account.pep_queue_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_queue_name
    private_connection_resource_id = azurerm_storage_account.this[0].id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.queue_private_dns_zone_id]
  }

  tags = local.tags
}

# Durable Function Storage

resource "azurerm_private_endpoint" "std_blob" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dblob_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dblob_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.blob_private_dns_zone_id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "std_file" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dfile_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dfile_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.file_private_dns_zone_id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "std_queue" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dqueue_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dqueue_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.queue_private_dns_zone_id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "std_table" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dtable_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.function_settings.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dtable_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["table"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [local.storage_account.table_private_dns_zone_id]
  }

  tags = local.tags
}
