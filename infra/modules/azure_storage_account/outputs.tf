output "name" {
  value = azurerm_storage_account.this.name
}

output "id" {
  value = azurerm_storage_account.this.id
}

output "resource_group_name" {
  value = azurerm_storage_account.this.resource_group_name
}

output "principal_id" {
  value = azurerm_storage_account.this.identity[0].principal_id
}

output "primary_connection_string" {
  value     = azurerm_storage_account.this.primary_connection_string
  sensitive = true
}

output "primary_web_host" {
  value = azurerm_storage_account.this.primary_web_host
}