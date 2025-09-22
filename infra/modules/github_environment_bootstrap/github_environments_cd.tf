resource "github_repository_environment" "infra_cd" {
  for_each    = toset(var.repository.environments)
  environment = "infra-${each.value}-cd"
  repository  = var.repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      var.repository.reviewers_teams
    )
  }
}

resource "github_repository_environment" "app_cd" {
  for_each    = toset(var.repository.environments)
  environment = "app-${each.value}-cd"
  repository  = var.repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      var.repository.reviewers_teams
    )
  }
}

resource "github_repository_environment" "opex_cd" {
  for_each    = toset(var.repository.environments)
  environment = "opex-${each.value}-cd"
  repository  = var.repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      var.repository.reviewers_teams
    )
  }
}

resource "github_repository_environment_deployment_policy" "infra_cd_branch" {
  for_each = { for k, v in setproduct(var.repository.environments, var.repository.infra_cd_policy_branches) : "${v[0]}-${v[1]}" => { env = v[0], branch = v[1] } }

  repository     = var.repository.name
  environment    = github_repository_environment.infra_cd[each.value.env].environment
  branch_pattern = each.value.branch
}

resource "github_repository_environment_deployment_policy" "app_cd_branch" {
  for_each = { for k, v in setproduct(var.repository.environments, var.repository.app_cd_policy_branches) : "${v[0]}-${v[1]}" => { env = v[0], branch = v[1] } }

  repository     = var.repository.name
  environment    = github_repository_environment.app_cd[each.value.env].environment
  branch_pattern = each.value.branch
}

resource "github_repository_environment_deployment_policy" "opex_cd_branch" {
  for_each = { for k, v in setproduct(var.repository.environments, var.repository.opex_cd_policy_branches) : "${v[0]}-${v[1]}" => { env = v[0], branch = v[1] } }

  repository     = var.repository.name
  environment    = github_repository_environment.opex_cd[each.value.env].environment
  branch_pattern = each.value.branch
}

resource "github_repository_environment_deployment_policy" "infra_cd_tag" {
  for_each = { for k, v in setproduct(var.repository.environments, var.repository.infra_cd_policy_tags) : "${v[0]}-${v[1]}" => { env = v[0], tag = v[1] } }

  repository  = var.repository.name
  environment = github_repository_environment.infra_cd[each.value.env].environment
  tag_pattern = each.value.tag
}

resource "github_repository_environment_deployment_policy" "app_cd_tag" {
  for_each = { for k, v in setproduct(var.repository.environments, var.repository.app_cd_policy_tags) : "${v[0]}-${v[1]}" => { env = v[0], tag = v[1] } }

  repository  = var.repository.name
  environment = github_repository_environment.app_cd[each.value.env].environment
  tag_pattern = each.value.tag
}

resource "github_repository_environment_deployment_policy" "opex_cd_tag" {
  for_each = { for k, v in setproduct(var.repository.environments, var.repository.opex_cd_policy_tags) : "${v[0]}-${v[1]}" => { env = v[0], tag = v[1] } }

  repository  = var.repository.name
  environment = github_repository_environment.opex_cd[each.value.env].environment
  tag_pattern = each.value.tag
}
