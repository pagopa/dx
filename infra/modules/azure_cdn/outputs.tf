output "id" {
  description = "The ID of the CDN FrontDoor Profile"
  value       = local.profile_id
}

output "name" {
  description = "The name of the CDN FrontDoor Profile"
  value       = local.profile_name
}

output "resource_group_name" {
  description = "The name of the resource group the CDN FrontDoor Profile was created in"
  value       = local.create_profile ? azurerm_cdn_frontdoor_profile.this[0].resource_group_name : data.azurerm_cdn_frontdoor_profile.existing[0].resource_group_name
}

output "endpoint_hostname" {
  description = "The hostname of the CDN FrontDoor Endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.this.host_name
}

output "origin_group_id" {
  description = "The ID of the CDN FrontDoor Origin Group"
  value       = azurerm_cdn_frontdoor_origin_group.this.id
}

output "principal_id" {
  description = "The principal ID of the Front Door Profile's system-assigned managed identity."
  value       = local.profile_identity_id
}

output "rule_set_id" {
  description = "The ID of the CDN FrontDoor Rule Set"
  value       = azurerm_cdn_frontdoor_rule_set.this.id
}

output "endpoint_id" {
  description = "The ID of the CDN FrontDoor Endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.this.id
}

output "endpoint_name" {
  description = "The name of the CDN FrontDoor Endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.this.name
}

output "diagnostic_settings" {
  description = "Details of the diagnostic settings configured for the CDN FrontDoor Profile."
  value = {
    id = try(azurerm_monitor_diagnostic_setting.this[0].id, null)
  }
}
