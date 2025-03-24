resource "azurerm_user_assigned_identity" "infra_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "ci")

  tags = var.tags
}

resource "azurerm_user_assigned_identity" "infra_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "cd")

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "github_infra_ci" {
  resource_group_name = azurerm_user_assigned_identity.infra_ci.resource_group_name
  name                = format(local.ids.federated_identity_name, "infra", "ci")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_ci.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.infra_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_infra_cd" {
  resource_group_name = azurerm_user_assigned_identity.infra_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "infra", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_cd.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.infra_environment_name, "cd")}"
}
