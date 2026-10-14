resource "github_repository_environment" "npm_prod_cd" {
  environment = "npm-prod-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "automation_dev_cd" {
  environment = "automation-dev-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "automation_dev_ci" {
  environment = "automation-dev-ci"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "automation_uat_cd" {
  environment = "automation-uat-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "automation_uat_ci" {
  environment = "automation-uat-ci"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "automation_prod_cd" {
  environment = "automation-prod-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment" "automation_prod_ci" {
  environment = "automation-prod-ci"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}
