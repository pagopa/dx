resource "github_repository_environment" "automated_tests" {
  environment = "main"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "npm_prod_cd" {
  environment = "npm_prod_cd"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
