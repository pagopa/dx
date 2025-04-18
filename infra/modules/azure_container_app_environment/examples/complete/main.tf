resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "example",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
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

module "container_app_environment" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.100.0/23"

  tags = local.tags
}
