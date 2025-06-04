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

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
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

resource "azurerm_user_assigned_identity" "example" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "managed_identity" }))
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.example.name

  tags = local.tags
}

resource "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = data.azurerm_virtual_network.common.id
  prefix_length      = 23
}

module "container_app_environment" {
  source = "../../../azure_container_app_environment"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = dx_available_subnet_cidr.next_cidr.cidr_block

  tags = local.tags
}

module "container_app" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  tier          = "xs"
  revision_mode = "Single"
  container_app_templates = [
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

  user_assigned_identity_id = azurerm_user_assigned_identity.example.id

  tags = local.tags
}
