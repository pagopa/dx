# ============================================================================
# RESOURCE - Custom Role Definition
# ============================================================================
# Create a new custom role that combines permissions from multiple built-in roles
# This allows fine-grained RBAC by bundling specific capabilities into one role

resource "azurerm_role_definition" "merged" {
  name        = var.role_name
  description = "Merged role from: ${join(", ", var.source_roles)}"
  scope       = data.azurerm_subscription.current.id

  # Assign all merged permissions to the custom role
  permissions {
    actions          = local.actions
    data_actions     = local.data_actions
    not_actions      = local.not_actions
    not_data_actions = local.not_data_actions
  }

  # This role can be assigned at the subscription level
  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
