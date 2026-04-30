# Subscription
resource "azurerm_role_assignment" "app_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to read resources at subscription scope"
}

# Resource Group
resource "azurerm_role_assignment" "app_ci_rgs_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "dx-app-ci-rg-reader"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to read application configuration and Static Web App secrets at ${each.value} resource group scope"
}
