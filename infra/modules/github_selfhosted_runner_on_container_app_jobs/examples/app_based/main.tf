module "container_app_job_selfhosted_runner" {
  source  = "pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm"
  version = "~> 1.4"

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
    name                        = local.key_vault.name
    resource_group_name         = local.key_vault.resource_group_name
    use_rbac                    = true
    app_key_secret_name         = "github-runner-app-key"
    app_id_secret_name          = "github-runner-app-id"
    installation_id_secret_name = "github-runner-app-installation-id"
  }

  tags = local.tags
}
