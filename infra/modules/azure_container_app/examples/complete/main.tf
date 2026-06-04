resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "example",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

data "azurerm_virtual_network" "common" {
  name                = local.virtual_network.name
  resource_group_name = local.virtual_network.resource_group_name
}

data "azurerm_log_analytics_workspace" "common" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "common",
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
    virtual_network_id = data.azurerm_virtual_network.common.id
  }

  tags = local.tags
}

module "container_app" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 5.0"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  size = {
    cpu    = 1
    memory = "2Gi"
  }

  deployment_strategy = "Incremental"
  containers = [
    {
      image = "nginx:latest"
      name  = "nginx"

      app_settings = {
        key1 = "value1"
        key2 = "value2"
      }

      liveness_probe = {
        path = "/"
      }
    },
  ]

  container_app_environment_id = module.container_app_environment.id
  container_port               = 80

  autoscaler = {
    replicas = {
      minimum = 0
      maximum = 1
    }

    http_scalers = [
      {
        name                = "http-scaler"
        concurrent_requests = 800
      }
    ]
  }

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  tags = local.tags
}
