module "github_runner" {
  source = "./modules/github_runner"

  naming_config = local.naming_config

  resource_group_name = azurerm_resource_group.gh_runner.name
  location            = var.environment.location

  runner_snet = module.network.runner_snet.id

  log_analytics_workspace_id = module.common_log_analytics.id

  tags = local.tags
}
