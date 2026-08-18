module "shared_container_app_environment" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 3.0"

  environment = merge(local.environment, {
    domain   = "shared"
    app_name = "apps"
  })
  resource_group_name = module.azure_core_values.common_resource_group_name
  use_case            = "default"

  log_analytics_workspace_id = module.azure_core_values.common_log_analytics_workspace.id
  networking = {
    virtual_network_id = module.azure_core_values.common_vnet.id
  }

  tags = local.tags
}
