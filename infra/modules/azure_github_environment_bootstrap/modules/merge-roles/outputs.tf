# ============================================================================
# OUTPUTS
# ============================================================================
# Provide visibility into the merged role composition
output "merged_actions_count" {
  description = "Total number of distinct actions in the merged role"
  value       = length(local.actions)
}

output "custom_role_id" {
  description = "ID of the newly created custom role definition"
  value       = azurerm_role_definition.merged.role_definition_id
}
