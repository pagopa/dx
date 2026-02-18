output "profile_id" {
  description = "The ID of the CDN profile"
  value       = module.azure_cdn.id
}


output "endpoint_host_name" {
  value       = module.azure_cdn.endpoint_hostname
  description = "CDN endpoint"
}
