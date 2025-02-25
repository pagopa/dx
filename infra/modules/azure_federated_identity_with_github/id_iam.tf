resource "azurerm_role_assignment" "ci_subscription" {
  for_each = (!var.continuos_integration.enable || var.continuos_integration.roles == null) ? toset([]) : var.continuos_integration.roles.subscription

  scope                = var.subscription_id
  role_definition_name = each.value
  principal_id         = azurerm_user_assigned_identity.ci[0].principal_id
}

resource "azurerm_role_assignment" "cd_subscription" {
  for_each = var.continuos_delivery.roles == null ? toset([]) : var.continuos_delivery.roles.subscription

  scope                = var.subscription_id
  role_definition_name = each.value
  principal_id         = azurerm_user_assigned_identity.cd[0].principal_id
}

resource "azurerm_role_assignment" "ci_rg" {
  count = length(local.ci_rg_roles)

  scope                = local.ci_rg_roles[count.index].resource_group_id
  role_definition_name = local.ci_rg_roles[count.index].role_name
  principal_id         = azurerm_user_assigned_identity.ci[0].principal_id
}

resource "azurerm_role_assignment" "cd_rg" {
  count = length(local.cd_rg_roles)

  scope                = local.cd_rg_roles[count.index].resource_group_id
  role_definition_name = local.cd_rg_roles[count.index].role_name
  principal_id         = azurerm_user_assigned_identity.cd[0].principal_id
}
