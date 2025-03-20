module "github_runner" {
  source  = "pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm"
  version = "~> 1.0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    instance_number = var.environment.instance_number
  }

  resource_group_name = azurerm_resource_group.main.name

  repository = {
    owner = var.repository.owner
    name  = var.repository.name
  }

  container_app_environment = {
    id                          = var.github_private_runner.container_app_environment_id
    location                    = var.github_private_runner.container_app_environment_location
    replica_timeout_in_seconds  = var.github_private_runner.replica_timeout_in_seconds
    polling_interval_in_seconds = var.github_private_runner.polling_interval_in_seconds
    min_instances               = var.github_private_runner.min_instances
    max_instances               = var.github_private_runner.max_instances
    use_labels                  = length(var.github_private_runner.labels) > 0
    override_labels             = var.github_private_runner.labels
    cpu                         = var.github_private_runner.cpu
    memory                      = var.github_private_runner.memory
  }

  key_vault = {
    name                = var.github_private_runner.key_vault.name
    resource_group_name = var.github_private_runner.key_vault.resource_group_name
    secret_name         = var.github_private_runner.key_vault.secret_name
    use_rbac            = var.github_private_runner.key_vault.use_rbac
  }

  tags = var.tags
}
