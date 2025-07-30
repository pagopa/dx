resource "github_repository_environment" "infra_cd" {
  environment = "infra-${local.env_name}-cd"
  repository  = var.repository.name

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

resource "github_repository_environment" "app_cd" {
  environment = "app-${local.env_name}-cd"
  repository  = var.repository.name

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

resource "github_repository_environment" "opex_cd" {
  environment = "opex-${local.env_name}-cd"
  repository  = var.repository.name

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

resource "github_repository_environment_deployment_policy" "infra_cd_branch" {
  for_each = var.repository.infra_cd_policy_branches

  repository     = var.repository.name
  environment    = github_repository_environment.infra_cd.environment
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "app_cd_branch" {
  for_each = var.repository.app_cd_policy_branches

  repository     = var.repository.name
  environment    = github_repository_environment.app_cd.environment
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "opex_cd_branch" {
  for_each = var.repository.opex_cd_policy_branches

  repository     = var.repository.name
  environment    = github_repository_environment.opex_cd.environment
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "infra_cd_tag" {
  for_each = var.repository.infra_cd_policy_tags

  repository  = var.repository.name
  environment = github_repository_environment.infra_cd.environment
  tag_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "app_cd_tag" {
  for_each = var.repository.app_cd_policy_tags

  repository  = var.repository.name
  environment = github_repository_environment.app_cd.environment
  tag_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "opex_cd_tag" {
  for_each = var.repository.opex_cd_policy_tags

  repository  = var.repository.name
  environment = github_repository_environment.opex_cd.environment
  tag_pattern = each.value
}

resource "github_actions_environment_secret" "infra_cd" {
  for_each = local.infra_cd.secrets

  repository      = var.repository.name
  environment     = github_repository_environment.infra_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "app_cd" {
  for_each = local.app_cd.secrets

  repository      = var.repository.name
  environment     = github_repository_environment.app_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_cd" {
  for_each = local.opex_cd.secrets

  repository      = var.repository.name
  environment     = github_repository_environment.opex_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}
