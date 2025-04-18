output "name" {
  value       = azurerm_storage_account.this.name
  description = "The name of the Azure Storage Account."
}

output "id" {
  value       = azurerm_storage_account.this.id
  description = "The ID of the Azure Storage Account."
}

output "resource_group_name" {
  value       = azurerm_storage_account.this.resource_group_name
  description = "The name of the resource group containing the Azure Storage Account."
}

output "principal_id" {
  value       = azurerm_storage_account.this.identity[0].principal_id
  description = "The principal ID of the managed identity associated with the Azure Storage Account."
}

output "primary_connection_string" {
  value       = azurerm_storage_account.this.primary_connection_string
  sensitive   = true
  description = "The primary connection string for the Azure Storage Account."
}

output "primary_web_host" {
  value       = azurerm_storage_account.this.primary_web_host
  description = "The primary web host URL for the Azure Storage Account."
}