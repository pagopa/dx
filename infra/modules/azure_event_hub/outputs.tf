output "namespace_id" {
  description = "Id of Event Hub Namespace."
  value       = module.event_hub.namespace_id
}

output "hub_ids" {
  description = "Map of hubs and their ids."
  value       = module.event_hub.hub_ids
}

output "key_ids" {
  description = "List of key ids."
  value       = module.event_hub.key_ids
}

output "name" {
  description = "The name of this Event Hub"
  value       = module.event_hub.name
}

output "keys" {
  description = "Map of hubs with keys => primary_key / secondary_key mapping."
  sensitive   = true
  value       = module.event_hub.keys
}

output "private_dns_zone" {
  description = "ID of the private DNS zone which resolves the name of the Private Endpoint used to connect to EventHub"
  value       = module.event_hub.private_dns_zone
}

#---------------#
# Configuration #
#---------------#

output "config_hub_ids" {
  description = "Map of hubs and their ids."
  value       = length(var.eventhubs) > 0 ? module.event_hub_configuration[0].hub_ids : null
}

output "config_key_ids" {
  description = "List of key ids."
  value       = length(var.eventhubs) > 0 ? module.event_hub_configuration[0].key_ids : null
}

output "config_keys" {
  description = "Map of hubs with keys => primary_key / secondary_key mapping."
  sensitive   = true
  value       = length(var.eventhubs) > 0 ? module.event_hub_configuration[0].keys : null
}