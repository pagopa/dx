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
