output "namespace_id" {
  description = "Id of Event Hub Namespace."
  value       = azurerm_eventhub_namespace.this.id
}

output "hub_ids" {
  description = "Map of hubs and their ids."
  value       = { for k, v in azurerm_eventhub.events : k => v.id }
}

output "key_ids" {
  description = "List of key ids."
  value       = local.keys
}

output "name" {
  description = "The name of this Event Hub"
  value       = azurerm_eventhub_namespace.this.name
}

output "private_dns_zone" {
  description = "ID of the private DNS zone which resolves the name of the Private Endpoint used to connect to EventHub"
  value = {
    id   = data.azurerm_private_dns_zone.this.id
    name = data.azurerm_private_dns_zone.this.name
  }
}