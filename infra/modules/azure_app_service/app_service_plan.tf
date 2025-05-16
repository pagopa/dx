resource "azurerm_service_plan" "this" {
  count = local.app_service_plan.enable ? 1 : 0

  name                   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service_plan" }))
  location               = var.environment.location
  resource_group_name    = var.resource_group_name
  os_type                = "Linux"
  sku_name               = local.app_service.sku_name
  zone_balancing_enabled = local.app_service.zone_balancing_enabled

  tags = local.tags
}
