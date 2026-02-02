output "endpoint_host_name" {
  description = "The hostname of the primary CDN endpoint"
  value       = module.azure_cdn_with_waf.endpoint_hostname
}

output "custom_domain_host_names" {
  description = "List of custom domain hostnames configured on the CDN"
  value       = []
  # In the advanced example we don't have custom domains configured
  # This output is here for compatibility with the e2e tests
}

output "cdn_profile_id" {
  description = "The ID of the CDN profile"
  value       = module.azure_cdn_with_waf.id
}

output "cdn_endpoint_id" {
  description = "The ID of the CDN endpoint"
  value       = module.azure_cdn_with_waf.endpoint_id
}
