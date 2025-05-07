resource "azurerm_user_assigned_identity" "opex_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.opex_name, "ci")

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "opex_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.opex_name, "cd")

  tags = local.tags
}

resource "azurerm_federated_identity_credential" "github_opex_ci" {
  resource_group_name = azurerm_user_assigned_identity.opex_ci.resource_group_name
  name                = format(local.ids.federated_identity_name, "opex", "ci")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.opex_ci.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.opex_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_opex_cd" {
  resource_group_name = azurerm_user_assigned_identity.opex_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "opex", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.opex_cd.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.opex_environment_name, "cd")}"
}
