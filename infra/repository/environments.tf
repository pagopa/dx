resource "github_repository_environment" "automated_tests" {
  environment = "integration-tests"
  repository  = module.github_repository.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
