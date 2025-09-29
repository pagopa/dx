module "gh_runner_integration_tests" {
  for_each = var.test_modes

  source  = "pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm"
  version = "~> 1.0"

  environment = merge(
    var.environment,
    { env_short = "d" }
  )

  repository = {
    name = "dx"
  }

  container_app_environment = {
    id              = azurerm_container_app_environment.tests[each.value].id
    location        = azurerm_container_app_environment.tests[each.value].location
    use_labels      = true
    override_labels = [each.value]
  }

  key_vault = {
    resource_group_name = var.gh_pat_reference.keyvault_resource_group_name
    name                = var.gh_pat_reference.keyvault_name
    use_rbac            = true
  }

  tags = var.tags
}
