data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_file" {
  name                = "privatelink.file.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_table" {
  name                = "privatelink.table.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_queue" {
  name                = "privatelink.queue.core.windows.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}

data "azurerm_private_dns_zone" "function_app" {
  name                = "privatelink.azurewebsites.net"
  resource_group_name = local.private_dns_zone.resource_group_name
}
