resource "github_repository_environment" "infra_prod_ci" {
  for_each = var.repository.configure ? { repo = var.repository.name } : {}

  environment = "infra-${local.env_long}-ci"
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_actions_environment_secret" "infra_prod_ci" {
  for_each = local.infra_ci.secrets

  repository      = local.repository_name
  environment     = var.repository.configure ? github_repository_environment.infra_prod_ci["repo"].environment : "infra-${local.env_long}-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

