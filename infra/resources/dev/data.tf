data "azurerm_user_assigned_identity" "infra_dev_ci" {
  name                = "${local.project}-github-ci-identity"
  resource_group_name = "${local.project}-identity-rg"
}

data "azurerm_user_assigned_identity" "infra_dev_cd" {
  name                = "${local.project}-github-cd-identity"
  resource_group_name = "${local.project}-identity-rg"
}
