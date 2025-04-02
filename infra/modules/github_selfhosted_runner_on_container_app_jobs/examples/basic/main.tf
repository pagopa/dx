module "container_app_job_selfhosted_runner" {
  source = "../.."

  environment = local.environment

  resource_group_name = data.azurerm_resource_group.gh_runner.name

  repository = {
    name = local.repo_name
  }

  container_app_environment = {
    id       = data.azurerm_container_app_environment.gh_runner.id
    location = local.environment.location
  }

  key_vault = {
    name                = local.key_vault.name
    resource_group_name = local.key_vault.resource_group_name
    use_rbac            = true
  }

  tags = local.tags
}
