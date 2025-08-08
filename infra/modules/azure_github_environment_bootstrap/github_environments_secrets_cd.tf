resource "github_actions_environment_secret" "infra_cd" {
  for_each = local.infra_cd.secrets

  repository      = var.repository.name
  environment     = "infra-${local.env_name}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "app_cd" {
  for_each = local.app_cd.secrets

  repository      = var.repository.name
  environment     = "app-${local.env_name}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_cd" {
  for_each = local.opex_cd.secrets

  repository      = var.repository.name
  environment     = "opex-${local.env_name}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}
