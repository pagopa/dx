resource "github_repository_environment" "infra_prod_cd" {
  environment = "infra-prod-cd"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      local.infra_cd.reviewers_teams
    )
  }
}

resource "github_repository_environment" "app_prod_cd" {
  environment = "app-prod-cd"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      local.app_cd.reviewers_teams
    )
  }
}

resource "github_repository_environment" "opex_prod_cd" {
  environment = "opex-prod-cd"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      local.app_cd.reviewers_teams
    )
  }
}

resource "github_repository_environment_deployment_policy" "infra_prod_cd" {
  repository     = github_repository.this.name
  environment    = github_repository_environment.infra_prod_cd.environment
  branch_pattern = github_branch_default.main.branch
}

resource "github_repository_environment_deployment_policy" "app_prod_cd" {
  repository     = github_repository.this.name
  environment    = github_repository_environment.app_prod_cd.environment
  branch_pattern = github_branch_default.main.branch
}

resource "github_repository_environment_deployment_policy" "opex_prod_cd" {
  repository     = github_repository.this.name
  environment    = github_repository_environment.opex_prod_cd.environment
  branch_pattern = github_branch_default.main.branch
}

resource "github_actions_environment_secret" "infra_prod_cd" {
  for_each = local.infra_cd.secrets

  repository      = github_repository.this.name
  environment     = github_repository_environment.infra_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "app_prod_cd" {
  for_each = local.app_cd.secrets

  repository      = github_repository.this.name
  environment     = github_repository_environment.app_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}


resource "github_actions_environment_secret" "opex_prod_cd" {
  for_each = local.opex_cd.secrets

  repository      = github_repository.this.name
  environment     = github_repository_environment.opex_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}
