resource "azurerm_user_assigned_identity" "app_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.app_name, "ci")

  tags = local.tags
}

resource "azurerm_federated_identity_credential" "github_app_ci" {
  name                      = format(local.ids.federated_identity_name, "app", "ci")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.app_ci.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.app_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_app_ci_immutable" {
  count = local.immutable_subject_enabled ? 1 : 0

  name                      = "${format(local.ids.federated_identity_name, "app", "ci")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.app_ci.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.app_environment_name, "ci")}"
}


resource "azurerm_user_assigned_identity" "app_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.app_name, "cd")

  tags = local.tags
}

resource "azurerm_federated_identity_credential" "github_app_cd" {
  name                      = format(local.ids.federated_identity_name, "app", "cd")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.app_cd.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.app_environment_name, "cd")}"
}

resource "azurerm_federated_identity_credential" "github_app_cd_immutable" {
  count = local.immutable_subject_enabled ? 1 : 0

  name                      = "${format(local.ids.federated_identity_name, "app", "cd")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.app_cd.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.app_environment_name, "cd")}"
}
