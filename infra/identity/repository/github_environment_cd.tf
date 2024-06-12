resource "github_repository_environment" "github_repository_environment_dev_cd" {
  environment = "dev-cd"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_actions_environment_secret" "env_dev_cd_secrets" {
  for_each = local.cd.secrets

  repository      = github_repository.this.name
  environment     = github_repository_environment.github_repository_environment_dev_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}
