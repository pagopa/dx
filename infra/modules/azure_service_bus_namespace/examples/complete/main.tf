data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = local.environment
}

resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.app_name,
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

module "service_bus_01" {
  source = "../../"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    app_name        = "test"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = local.virtual_network.resource_group_name

  use_case = "default"

  tags = local.tags
}
