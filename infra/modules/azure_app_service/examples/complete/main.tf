data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network_name
  resource_group_name  = local.network_rg_name
}

resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "modules",
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

resource "azurerm_user_assigned_identity" "example" {
  name                = "example"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location
}

module "azure_app_service" {
  source              = "../../"
  environment         = local.environment
  tier                = "l"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = local.virtual_network_name
    resource_group_name = local.network_rg_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.250.0/24"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"
  tags              = local.tags
}
