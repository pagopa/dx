resource "azurerm_service_plan" "this" {
  name                   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service_plan" }))
  location               = var.environment.location
  resource_group_name    = var.resource_group_name
  os_type                = "Linux"
  sku_name               = local.sku_name
  zone_balancing_enabled = local.zone_balancing_enabled

  tags = local.tags
}
