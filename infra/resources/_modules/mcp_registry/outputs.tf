output "apic_service_id" {
  description = "The ID of the API Center service"
  value       = azapi_resource.apic_service.id
}

output "apic_service_name" {
  description = "The name of the API Center service"
  value       = azapi_resource.apic_service.name
}

output "workspace_id" {
  description = "The ID of the default workspace"
  value       = "${azapi_resource.apic_service.id}/workspaces/default"
}

output "environment_id" {
  description = "The ID of the production environment"
  value       = azapi_resource.prod_environment.id
}

output "mcp_api_ids" {
  description = "Map of MCP server names to their API IDs"
  value       = { for k, v in azapi_resource.mcp_api : k => v.id }
}

output "mcp_deployment_ids" {
  description = "Map of MCP server names to their deployment IDs"
  value       = { for k, v in azapi_resource.mcp_deployment : k => v.id }
}
