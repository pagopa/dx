resource "github_repository_environment" "automated_tests" {
  environment = "integration-tests"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "npm_prod_cd" {
  environment = "npm-prod-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "certificates_dev_cd" {
  environment = "certificates-dev-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "certificates_uat_cd" {
  environment = "certificates-uat-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "certificates_prod_cd" {
  environment = "certificates-prod-cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
