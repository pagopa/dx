resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-example-rg-${local.environment.instance_number}"
  location = local.environment.location

  tags = local.tags
}


data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-network-rg-01"
}

data "azurerm_log_analytics_workspace" "common" {
  name                = "${local.project}-common-log-${local.environment.instance_number}"
  resource_group_name = "${local.project}-common-rg-01"
}

module "container_app_environment" {
  source = "../../../azure_container_app_environment"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  virtual_network = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.100.0/23"

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
    },
    {
      image = "nginx:latest"
      name  = "nginx-2"

      app_settings = {
        key1 = "value1"
        key2 = "value2"
      }
    }
  ]

  container_app_environment_id = module.container_app_environment.id

  tags = local.tags
}
