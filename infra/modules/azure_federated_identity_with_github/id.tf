resource "azurerm_user_assigned_identity" "ci" {
  count = local.is_ci_enabled

  resource_group_name = local.resource_group_name
  location            = var.environment.location
  name                = format(local.identity_name, var.identity_type, "ci")

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "cd" {
  count = local.is_cd_enabled

  resource_group_name = local.resource_group_name
  location            = var.environment.location
  name                = format(local.identity_name, var.identity_type, "cd")

  tags = local.tags
}

resource "azurerm_federated_identity_credential" "ci_github" {
  count = local.is_ci_enabled

  resource_group_name = local.resource_group_name
  name                = format(local.federation_prefix, var.identity_type, "ci")
  audience            = local.ci_github_federations.audience
  issuer              = local.ci_github_federations.issuer
  parent_id           = azurerm_user_assigned_identity.ci[0].id
  subject             = local.ci_github_federations.subject
}

resource "azurerm_federated_identity_credential" "cd_github" {
  count = local.is_cd_enabled

  resource_group_name = local.resource_group_name
  name                = format(local.federation_prefix, var.identity_type, "cd")
  audience            = local.cd_github_federations.audience
  issuer              = local.cd_github_federations.issuer
  parent_id           = azurerm_user_assigned_identity.cd[0].id
  subject             = local.cd_github_federations.subject
}
