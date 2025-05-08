# AzureWebJobsStorage

resource "azurerm_private_endpoint" "st_blob" {
  name                = local.storage_account.pep_blob_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_blob_name
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_blob.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_file" {
  name                = local.storage_account.pep_file_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_file_name
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_file.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_queue" {
  name                = local.storage_account.pep_queue_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_queue_name
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_queue.id]
  }

  tags = local.tags
}

# Durable Function Storage

resource "azurerm_private_endpoint" "std_blob" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dblob_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dblob_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_blob.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "std_file" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dfile_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dfile_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_file.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "std_queue" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dqueue_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dqueue_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_queue.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "std_table" {
  count = local.function_app.has_durable

  name                = local.storage_account.pep_dtable_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.storage_account.pep_dtable_name
    private_connection_resource_id = azurerm_storage_account.durable_function[0].id
    is_manual_connection           = false
    subresource_names              = ["table"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_table[0].id]
  }

  tags = local.tags
}

# Function App
resource "azurerm_private_endpoint" "function_sites" {
  name                = local.function_app.pep_sites
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.function_app.pep_sites
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.function_app.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "staging_function_sites" {
  count = local.function_app.is_slot_enabled

  name                = local.function_app.pep_sites_staging
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.function_app.pep_sites_staging
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites-${azurerm_linux_function_app_slot.this[0].name}"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.function_app.id]
  }

  tags = local.tags
}
