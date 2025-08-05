resource "github_actions_environment_secret" "infra_prod_ci" {
  for_each = local.infra_ci.secrets

  repository      = var.repository.name
  environment     = "infra-${local.env_long}-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

