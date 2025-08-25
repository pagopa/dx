resource "github_actions_environment_secret" "app_ci" {
  for_each = local.app_ci.secrets

  repository      = var.repository.name
  environment     = "app-${local.env_name}-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "infra_ci" {
  for_each = local.infra_ci.secrets

  repository      = var.repository.name
  environment     = "infra-${local.env_name}-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_ci" {
  for_each = local.opex_ci.secrets

  repository      = var.repository.name
  environment     = "opex-${local.env_name}-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

