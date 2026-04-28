# ============================================================================
# RESOURCE - Custom Role Definition
# ============================================================================
# Create a new custom role that combines built-in roles into the single
# permissions object Azure accepts for custom roles.

resource "azurerm_role_definition" "merged" {
  name              = trimspace(var.role_name)
  description       = local.merged_description
  scope             = var.scope
  assignable_scopes = [var.scope]

  # Azure custom roles support a single permissions object, so the module
  # compacts the merged result into one effective block.
  permissions {
    actions          = local.merged_permissions.actions
    data_actions     = local.merged_permissions.data_actions
    not_actions      = local.merged_permissions.not_actions
    not_data_actions = local.merged_permissions.not_data_actions
  }
}
