locals {
  name                = var.domain == "" ? "${var.prefix}-${var.env_short}" : "${var.prefix}-${var.env_short}-${var.domain}"
  resource_group_name = var.resource_group_name == null ? "${var.prefix}-${var.env_short}-identity-rg" : var.resource_group_name
  identity_name       = "${local.name}-github-%s-identity"
  federation_prefix   = "${local.name}-github"

  ci_github_federations = tolist(flatten([
    for repo in var.repositories : {
      org               = "pagopa"
      repository        = repo
      audience          = ["api://AzureADTokenExchange"]
      issuer            = "https://token.actions.githubusercontent.com"
      credentials_scope = "environment"
      subject           = "${var.env}-ci"
    }
  ]))

  cd_github_federations = tolist(flatten([
    for repo in var.repositories : {
      org               = "pagopa"
      repository        = repo
      audience          = ["api://AzureADTokenExchange"]
      issuer            = "https://token.actions.githubusercontent.com"
      credentials_scope = "environment"
      subject           = "${var.env}-cd"
    }
  ]))

  ci_rg_roles = tolist(flatten([
    for rg in data.azurerm_resource_group.ci_details : [
      for role in var.continuos_integration.roles.resource_groups[rg.name] : {
        resource_group_id = rg.id
        role_name         = role
      }
    ]
  ]))

  cd_rg_roles = tolist(flatten([
    for rg in data.azurerm_resource_group.cd_details : [
      for role in var.continuos_delivery.roles.resource_groups[rg.name] : {
        resource_group_id = rg.id
        role_name         = role
      }
    ]
  ]))
}
