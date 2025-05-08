data "azurerm_user_assigned_identity" "infra_dev_ci" {
  name                = "${local.project}-common-infra-github-ci-id-01"
  resource_group_name = "${local.project}-common-identity-rg-01"
}

data "azurerm_user_assigned_identity" "infra_dev_cd" {
  name                = "${local.project}-common-infra-github-cd-id-01"
  resource_group_name = "${local.project}-common-identity-rg-01"
}
