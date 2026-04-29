# ============================================================================
# OUTPUTS
# ============================================================================
# Expose the generated role references so downstream configurations can assign
# the custom role by name or by resource ID.
output "custom_role_id" {
  description = "ID of the newly created custom role definition"
  value       = azurerm_role_definition.merged.role_definition_resource_id
}

output "custom_role_name" {
  description = "Display name of the newly created custom role definition"
  value       = azurerm_role_definition.merged.name
}
