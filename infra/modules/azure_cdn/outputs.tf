output "id" {
  description = "The ID of the CDN FrontDoor Profile"
  value       = azurerm_cdn_frontdoor_profile.this.id
}

output "name" {
  description = "The name of the CDN FrontDoor Profile"
  value       = azurerm_cdn_frontdoor_profile.this.name
}

output "resource_group_name" {
  description = "The name of the resource group the CDN FrontDoor Profile was created in"
  value       = azurerm_cdn_frontdoor_profile.this.resource_group_name
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
  value       = azurerm_cdn_frontdoor_profile.this.identity[0].principal_id
}
