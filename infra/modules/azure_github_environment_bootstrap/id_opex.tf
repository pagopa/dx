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
  name                      = format(local.ids.federated_identity_name, "opex", "ci")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.opex_ci.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.opex_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_opex_cd" {
  name                      = format(local.ids.federated_identity_name, "opex", "cd")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.opex_cd.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.opex_environment_name, "cd")}"
}

# Credentials for repositories that emit immutable subject claims. GitHub embeds
# the numeric owner and repository IDs for repositories created or renamed after
# 2026-07-15; both formats are federated so each repository matches exactly one
# of them.
resource "azurerm_federated_identity_credential" "github_opex_ci_immutable" {
  name                      = "${format(local.ids.federated_identity_name, "opex", "ci")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.opex_ci.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.opex_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_opex_cd_immutable" {
  name                      = "${format(local.ids.federated_identity_name, "opex", "cd")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.opex_cd.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.opex_environment_name, "cd")}"
}
