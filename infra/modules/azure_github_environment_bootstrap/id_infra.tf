resource "azurerm_user_assigned_identity" "infra_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "ci")

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "infra_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "cd")

  tags = local.tags
}

resource "azurerm_federated_identity_credential" "github_infra_ci" {
  name                      = format(local.ids.federated_identity_name, "infra", "ci")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.infra_ci.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.infra_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_infra_cd" {
  name                      = format(local.ids.federated_identity_name, "infra", "cd")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.infra_cd.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.infra_environment_name, "cd")}"
}

resource "azurerm_federated_identity_credential" "github_automation_cd" {
  name                      = format(local.ids.federated_identity_name, "automation", "cd")
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.infra_cd.id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${format(local.ids.automation_environment_name, "cd")}"
}

# Credentials for repositories that emit immutable subject claims. GitHub embeds
# the numeric owner and repository IDs for repositories created or renamed after
# 2026-07-15; both formats are federated so each repository matches exactly one
# of them.
resource "azurerm_federated_identity_credential" "github_infra_ci_immutable" {
  name                      = "${format(local.ids.federated_identity_name, "infra", "ci")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.infra_ci.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.infra_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_infra_cd_immutable" {
  name                      = "${format(local.ids.federated_identity_name, "infra", "cd")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.infra_cd.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.infra_environment_name, "cd")}"
}

resource "azurerm_federated_identity_credential" "github_automation_cd_immutable" {
  name                      = "${format(local.ids.federated_identity_name, "automation", "cd")}-immutable"
  audience                  = local.ids.audience
  issuer                    = local.ids.issuer
  user_assigned_identity_id = azurerm_user_assigned_identity.infra_cd.id
  subject                   = "repo:${local.immutable_repository_slug}:environment:${format(local.ids.automation_environment_name, "cd")}"
}
