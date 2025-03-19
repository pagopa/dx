module "app_service_plan" {
  count = local.app_service_plan.enable ? 1 : 0

  source = "../azure_app_service_plan"

  naming = {
    prefix = module.naming_convention.prefix
    suffix = module.naming_convention.suffix
  }

  location            = var.environment.location
  resource_group_name = var.resource_group_name
  tier                = var.tier

  tags = var.tags
}

moved {
  from = azurerm_service_plan.this[0]
  to   = module.app_service_plan.azurerm_service_plan.this
}
