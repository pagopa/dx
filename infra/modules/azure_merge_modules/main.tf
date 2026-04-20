# ============================================================================
# RESOURCE - Custom Role Definition
# ============================================================================
# Create a new custom role that combines built-in roles while preserving each
# source permission block. This keeps Azure RBAC exclusion semantics intact.

resource "azurerm_role_definition" "merged" {
  name              = trimspace(var.role_name)
  description       = local.merged_description
  scope             = var.scope
  assignable_scopes = local.assignable_scopes

  # Render one permissions block for each normalized source block so exclusions
  # remain scoped to the block that originally declared them.
  dynamic "permissions" {
    for_each = local.permission_blocks

    content {
      actions          = permissions.value.actions
      data_actions     = permissions.value.data_actions
      not_actions      = permissions.value.not_actions
      not_data_actions = permissions.value.not_data_actions
    }
  }
}
