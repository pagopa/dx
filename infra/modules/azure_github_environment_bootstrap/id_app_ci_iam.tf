# Subscription
resource "azurerm_role_assignment" "app_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to read resources at subscription scope"
}

# PagoPA IaC Reader role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_ci_subscription_pagopa_iac_reader" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA IaC Reader"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CI identity to read resources configuration at managed resource group scopes"
}

# PagoPA Static Web Apps List Secrets role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_ci_subscription_static_webapp_secrets" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA Static Web Apps List Secrets"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CI identity to read Static Web Apps secrets at managed resource group scopes"
}
