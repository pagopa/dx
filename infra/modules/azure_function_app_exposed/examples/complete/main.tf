module "naming_convention" {
  source = "../../../azure_naming_convention"

  environments = [local.environment]
}

resource "azurerm_resource_group" "example" {
  name     = module.naming_convention.name.resource_group["1"]
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