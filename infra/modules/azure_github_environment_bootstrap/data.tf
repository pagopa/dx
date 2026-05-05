data "azurerm_subscription" "current" {
  subscription_id = local.parsed_subscription_id.subscription_id
}

data "azurerm_role_definition" "dx_app_ci_resource_groups" {
  name  = local.custom_role_definition_names.dx_app_ci_resource_groups
  scope = var.subscription_id
}

data "azurerm_role_definition" "dx_app_cd_resource_groups" {
  name  = local.custom_role_definition_names.dx_app_cd_resource_groups
  scope = var.subscription_id
}

data "azurerm_role_definition" "dx_infra_ci_subscription" {
  name  = local.custom_role_definition_names.dx_infra_ci_subscription
  scope = var.subscription_id
}

data "azurerm_role_definition" "dx_infra_ci_resource_groups" {
  name  = local.custom_role_definition_names.dx_infra_ci_resource_groups
  scope = var.subscription_id
}

data "azurerm_role_definition" "dx_infra_cd_subscription" {
  name  = local.custom_role_definition_names.dx_infra_cd_subscription
  scope = var.subscription_id
}

data "azurerm_role_definition" "dx_infra_cd_resource_groups" {
  name  = local.custom_role_definition_names.dx_infra_cd_resource_groups
  scope = var.subscription_id
}

data "azurerm_role_definition" "dx_infra_cd_private_networking" {
  name  = local.custom_role_definition_names.dx_infra_cd_private_networking
  scope = var.subscription_id
}
