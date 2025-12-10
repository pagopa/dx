data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_blob" {
  count = var.private_dns_zone_ids != null ? var.private_dns_zone_ids.blob != null ? 0 : 1 : 1

  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_file" {
  count = var.private_dns_zone_ids != null ? var.private_dns_zone_ids.file != null ? 0 : 1 : 1

  name                = "privatelink.file.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_queue" {
  count = var.private_dns_zone_ids != null ? var.private_dns_zone_ids.queue != null ? 0 : 1 : 1

  name                = "privatelink.queue.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_table" {
  count = local.function_app.has_durable == 1 && (var.private_dns_zone_ids == null ? true : var.private_dns_zone_ids.table == null) ? 1 : 0

  name                = "privatelink.table.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "function_app" {
  count = var.private_dns_zone_ids != null ? var.private_dns_zone_ids.azurewebsites != null ? 0 : 1 : 1

  name                = "privatelink.azurewebsites.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}
