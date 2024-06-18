data "azurerm_user_assigned_identity" "identity_prod_ci" {
  name                = "${local.project}-github-ci-identity"
  resource_group_name = local.identity_resource_group_name
}

data "azurerm_user_assigned_identity" "identity_prod_cd" {
  name                = "${local.project}-github-cd-identity"
  resource_group_name = local.identity_resource_group_name
}
