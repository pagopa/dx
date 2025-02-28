output "id" {
  description = "The ID of the CDN FrontDoor Profile"
  value       = azurerm_cdn_frontdoor_profile.this.id
}

output "endpoint_hostname" {
  description = "The hostname of the CDN FrontDoor Endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.this.host_name
}

output "origin_group_id" {
  description = "The ID of the CDN FrontDoor Origin Group"
  value       = azurerm_cdn_frontdoor_origin_group.this.id
}
