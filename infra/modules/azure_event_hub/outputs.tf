output "namespace_id" {
  description = "The ID of the Event Hub Namespace."
  value       = azurerm_eventhub_namespace.this.id
}

output "hub_ids" {
  description = "A map containing the names of Event Hubs as keys and their corresponding IDs as values."
  value       = { for k, v in azurerm_eventhub.events : k => v.id }
}

output "key_ids" {
  description = "A list of IDs for the keys associated with the Event Hub."
  value       = local.keys
}

output "name" {
  description = "The name of the Event Hub Namespace."
  value       = azurerm_eventhub_namespace.this.name
}

output "private_dns_zone" {
  description = "Details of the private DNS zone used to resolve the name of the Private Endpoint for connecting to the Event Hub. Includes the DNS zone ID and name."
  value = {
    id   = data.azurerm_private_dns_zone.this.id
    name = data.azurerm_private_dns_zone.this.name
  }
}