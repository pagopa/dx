resource "github_repository_environment" "infra_ci" {
  environment = "infra-${local.env_name}-ci"
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "opex_ci" {
  environment = "opex-${local.env_name}-ci"
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_actions_environment_secret" "infra_ci" {
  for_each = local.infra_ci.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.infra_ci.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_ci" {
  for_each = local.opex_ci.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.opex_ci.environment
  secret_name     = each.key
  plaintext_value = each.value
}

