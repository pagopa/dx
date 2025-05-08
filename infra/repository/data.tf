data "azurerm_user_assigned_identity" "identity_dev_ci" {
  name                = "${local.project}-common-infra-github-ci-id-01"
  resource_group_name = local.identity_resource_group_name
}

data "azurerm_user_assigned_identity" "identity_dev_cd" {
  name                = "${local.project}-common-infra-github-cd-id-01"
  resource_group_name = local.identity_resource_group_name
}

data "github_repository" "this" {
  full_name = "pagopa/dx"
}