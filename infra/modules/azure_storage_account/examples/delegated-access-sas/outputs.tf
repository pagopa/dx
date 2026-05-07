output "container_name" {
  value       = local.container_name
  description = "Blob container used by the delegated access verification flow."
}

output "managed_identity_client_id" {
  value       = azurerm_user_assigned_identity.sas_tester.client_id
  description = "Client ID of the user-assigned managed identity that can generate the user delegation SAS."
}

output "managed_identity_principal_id" {
  value       = azurerm_user_assigned_identity.sas_tester.principal_id
  description = "Principal ID of the user-assigned managed identity that can generate the user delegation SAS."
}

output "resource_group_name" {
  value       = azurerm_resource_group.this.name
  description = "Resource group containing the delegated-access example resources."
}

output "storage_account_id" {
  value       = module.storage_account.id
  description = "Resource ID of the delegated-access storage account."
}

output "storage_account_name" {
  value       = module.storage_account.name
  description = "Name of the delegated-access storage account."
}