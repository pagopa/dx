resource "azurerm_user_assigned_identity" "ci" {
  count = local.is_ci_enabled

  resource_group_name = local.resource_group_name
  location            = var.location
  name                = format(local.identity_name, "ci")

  tags = var.tags
}

resource "azurerm_user_assigned_identity" "cd" {
  count = local.is_cd_enabled

  resource_group_name = local.resource_group_name
  location            = var.location
  name                = format(local.identity_name, "cd")

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "ci_github" {
  for_each = { for g in local.ci_github_federations : "${g.repository}.${g.credentials_scope}.${replace(g.subject, "/", ".")}" => g } # key must be unique

  resource_group_name = local.resource_group_name
  name                = "${local.federation_prefix}-${each.value.repository}-${each.value.credentials_scope}-${replace(each.value.subject, "/", "-")}"
  audience            = each.value.audience
  issuer              = each.value.issuer
  parent_id           = azurerm_user_assigned_identity.ci[0].id
  subject             = each.value.subject == "pull_request" ? "repo:${each.value.org}/${each.value.repository}:${each.value.subject}" : "repo:${each.value.org}/${each.value.repository}:${each.value.credentials_scope}:${each.value.subject}"
}

resource "azurerm_federated_identity_credential" "cd_github" {
  for_each = { for g in local.cd_github_federations : "${g.repository}.${g.credentials_scope}.${replace(g.subject, "/", ".")}" => g } # key must be unique

  resource_group_name = local.resource_group_name
  name                = "${local.federation_prefix}-${each.value.repository}-${each.value.credentials_scope}-${replace(each.value.subject, "/", "-")}"
  audience            = each.value.audience
  issuer              = each.value.issuer
  parent_id           = azurerm_user_assigned_identity.cd[0].id
  subject             = each.value.subject == "pull_request" ? "repo:${each.value.org}/${each.value.repository}:${each.value.subject}" : "repo:${each.value.org}/${each.value.repository}:${each.value.credentials_scope}:${each.value.subject}"
}
