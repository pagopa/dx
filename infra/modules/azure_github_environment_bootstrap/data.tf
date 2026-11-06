data "azurerm_subscription" "current" {}

data "azurerm_role_definition" "dx_app_ci_resource_groups" {
  name  = local.custom_role_definition_names.dx_app_ci_resource_groups
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_app_cd_resource_groups" {
  name  = local.custom_role_definition_names.dx_app_cd_resource_groups
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_ci_subscription" {
  name  = local.custom_role_definition_names.dx_infra_ci_subscription
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_ci_subscription_state_safe" {
  count = var.terraform_state_container_access == null ? 0 : 1

  name  = local.custom_role_definition_names.dx_infra_ci_subscription_state_safe
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_ci_resource_groups" {
  name  = local.custom_role_definition_names.dx_infra_ci_resource_groups
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_cd_subscription" {
  name  = local.custom_role_definition_names.dx_infra_cd_subscription
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_cd_subscription_no_rbac_admin" {
  count = var.terraform_state_container_access == null ? 0 : 1

  name  = local.custom_role_definition_names.dx_infra_cd_subscription_no_rbac_admin
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_cd_resource_groups" {
  name  = local.custom_role_definition_names.dx_infra_cd_resource_groups
  scope = data.azurerm_subscription.current.id
}

data "azurerm_role_definition" "dx_infra_cd_private_networking" {
  name  = local.custom_role_definition_names.dx_infra_cd_private_networking
  scope = data.azurerm_subscription.current.id
}

# The numeric GitHub IDs are required to build immutable OIDC subject claims
# (`repo:OWNER@OWNER-ID/REPO@REPO-ID:...`). `summary_only` avoids listing
# repositories and members when reading the organization.
data "github_organization" "owner" {
  count = var.repository.owner_id == null ? 1 : 0

  name         = var.repository.owner
  summary_only = true
}

data "github_repository" "this" {
  name = var.repository.name
}
