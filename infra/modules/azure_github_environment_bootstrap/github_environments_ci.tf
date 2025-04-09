resource "github_repository_environment" "infra_prod_ci" {
  environment = "infra-prod-ci"
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "opex_prod_ci" {
  environment = "opex-prod-ci"
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_actions_environment_secret" "infra_prod_ci" {
  for_each = local.infra_ci.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.infra_prod_ci.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_prod_ci" {
  for_each = local.opex_ci.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.opex_prod_ci.environment
  secret_name     = each.key
  plaintext_value = each.value
}

