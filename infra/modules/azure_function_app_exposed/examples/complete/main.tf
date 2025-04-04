resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.domain,
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

resource "azurerm_user_assigned_identity" "example" {
  name                = "example"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location
}

module "azure_function_app_exposed" {
  source = "../../"

  environment         = local.environment
  tier                = "l"
  resource_group_name = azurerm_resource_group.example.name

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = local.tags
}