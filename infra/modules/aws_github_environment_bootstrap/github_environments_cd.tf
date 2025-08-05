#trivy:ignore:AVD-GIT-0002
resource "github_actions_environment_secret" "infra_cd" {
  for_each = local.infra_cd.secrets

  repository      = var.repository.name
  environment     = "infra-${local.env_name}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

#trivy:ignore:AVD-GIT-0002
resource "github_actions_environment_secret" "app_cd" {
  for_each = local.app_cd.secrets

  repository      = var.repository.name
  environment     = "app-${local.env_name}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}
