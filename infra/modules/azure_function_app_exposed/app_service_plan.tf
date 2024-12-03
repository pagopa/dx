resource "azurerm_service_plan" "this" {
  count = local.app_service_plan.enable ? 1 : 0

  name                = local.app_service_plan.name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = local.function_app.sku_name
  # zone_balancing_enabled = local.function_app.zone_balancing_enabled

  tags = var.tags
}
