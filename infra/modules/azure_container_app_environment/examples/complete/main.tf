resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.environment, {
    app_name      = "cae",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

data "azurerm_log_analytics_workspace" "common" {
  name = provider::dx::resource_name(merge(local.environment, {
    domain        = "",
    app_name      = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.environment, {
    domain        = "",
    app_name      = "common",
    resource_type = "resource_group"
  }))
}

module "container_app_environment" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 2.0"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  networking = {
    virtual_network = {
      name                = local.virtual_network.name
      resource_group_name = local.virtual_network.resource_group_name
    }
  }

  tags = local.tags
}
