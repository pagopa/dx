resource "github_repository_environment" "infra_ci" {
  for_each    = toset(var.repository.environments)
  environment = "infra-${each.value}-ci"
  repository  = var.repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "app_ci" {
  for_each    = toset(var.repository.environments)
  environment = "app-${each.value}-ci"
  repository  = var.repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}


resource "github_repository_environment" "opex_ci" {
  for_each    = toset(var.repository.environments)
  environment = "opex-${each.value}-ci"
  repository  = var.repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}
