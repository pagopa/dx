output "storage_account_name" {
  value = azurerm_storage_account.e2e.name
}

output "storage_account_id" {
  value = azurerm_storage_account.e2e.id
}

output "resource_group_name" {
  value = azurerm_resource_group.e2e_blob_rbac.name
}

output "container_name" {
  value = local.container_name
}

output "limited_app_ip_address" {
  value = azurerm_container_group.limited_app.ip_address
}

output "full_app_ip_address" {
  value = azurerm_container_group.full_app.ip_address
}
