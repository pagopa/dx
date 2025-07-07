output "id" {
  value = azurerm_application_insights.appi.id
}

output "name" {
  value = azurerm_application_insights.appi.name
}

output "resource_group_name" {
  value = var.resource_group_name
}

output "instrumentation_key_kv_secret_id" {
  value = azurerm_key_vault_secret.appinsights_instrumentation_key.versionless_id
}

output "instrumentation_key_kv_secret_name" {
  value = azurerm_key_vault_secret.appinsights_instrumentation_key.name
}
