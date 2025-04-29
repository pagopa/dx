resource "github_repository_environment" "infra_prod_cd" {
  environment = "infra-prod-cd"
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
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
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
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
  repository  = local.repository_name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      local.app_cd.reviewers_teams
    )
  }
}

resource "github_repository_environment_deployment_policy" "infra_prod_cd_branch" {
  for_each = var.repository.infra_cd_policy_branches

  repository     = local.repository_name
  environment    = github_repository_environment.infra_prod_cd.environment
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "app_prod_cd_branch" {
  for_each = var.repository.app_cd_policy_branches

  repository     = local.repository_name
  environment    = github_repository_environment.app_prod_cd.environment
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "opex_prod_cd_branch" {
  for_each = var.repository.opex_cd_policy_branches

  repository     = local.repository_name
  environment    = github_repository_environment.opex_prod_cd.environment
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "infra_prod_cd_tag" {
  for_each = var.repository.infra_cd_policy_tags

  repository  = local.repository_name
  environment = github_repository_environment.infra_prod_cd.environment
  tag_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "app_prod_cd_tag" {
  for_each = var.repository.app_cd_policy_tags

  repository  = local.repository_name
  environment = github_repository_environment.app_prod_cd.environment
  tag_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "opex_prod_cd_tag" {
  for_each = var.repository.opex_cd_policy_tags

  repository  = local.repository_name
  environment = github_repository_environment.opex_prod_cd.environment
  tag_pattern = each.value
}

resource "github_actions_environment_secret" "infra_prod_cd" {
  for_each = local.infra_cd.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.infra_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "app_prod_cd" {
  for_each = local.app_cd.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.app_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_prod_cd" {
  for_each = local.opex_cd.secrets

  repository      = local.repository_name
  environment     = github_repository_environment.opex_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}
