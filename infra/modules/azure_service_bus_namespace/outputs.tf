output "id" {
  value       = azurerm_servicebus_namespace.this.id
  description = "The ID of the Service Bus namespace."
}

output "name" {
  value       = azurerm_servicebus_namespace.this.name
  description = "The name of the Service Bus namespace."
}

output "resource_group_name" {
  value       = azurerm_servicebus_namespace.this.resource_group_name
  description = "The name of the Azure Resource Group where the Service Bus namespace is deployed."
}

output "diagnostic_settings" {
  description = "Details of the diagnostic settings configured for the Service Bus Namespace."
  value = {
    id = try(azurerm_monitor_diagnostic_setting.this[0].id, null)
  }
}
