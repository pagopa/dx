resource "github_repository_environment" "infra_cd" {
  for_each = var.repository.create_environments ? { repo = var.repository.name } : {}
  environment = "infra-${local.env_long}-cd"
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

resource "github_repository_environment" "app_cd" {
  for_each = var.repository.create_environments ? { repo = var.repository.name } : {}
  environment = "app-${local.env_long}-cd"
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

resource "github_repository_environment_deployment_policy" "infra_cd_branch" {
  for_each = var.repository.infra_cd_policy_branches

  repository     = local.repository_name
  environment    = var.repository.create_environments ? github_repository_environment.infra_cd["repo"].environment : "infra-${local.env_long}-cd"
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "app_cd_branch" {
  for_each = var.repository.app_cd_policy_branches

  repository     = local.repository_name
  environment    = var.repository.create_environments ? github_repository_environment.app_cd["repo"].environment : "app-${local.env_long}-cd"
  branch_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "infra_cd_tag" {
  for_each = var.repository.infra_cd_policy_tags

  repository  = local.repository_name
  environment = var.repository.create_environments ? github_repository_environment.infra_cd["repo"].environment : "infra-${local.env_long}-cd"
  tag_pattern = each.value
}

resource "github_repository_environment_deployment_policy" "app_cd_tag" {
  for_each = var.repository.app_cd_policy_tags

  repository  = local.repository_name
  environment = var.repository.create_environments ? github_repository_environment.app_cd["repo"].environment : "app-${local.env_long}-cd"
  tag_pattern = each.value
}

resource "github_actions_environment_secret" "infra_cd" {
  for_each = local.infra_cd.secrets

  repository      = local.repository_name
  environment     = var.repository.create_environments ? github_repository_environment.infra_cd["repo"].environment : "infra-${local.env_long}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "app_cd" {
  for_each = local.app_cd.secrets

  repository      = local.repository_name
  environment     = var.repository.create_environments ? github_repository_environment.app_cd["repo"].environment : "app-${local.env_long}-cd"
  secret_name     = each.key
  plaintext_value = each.value
}
