resource "azurerm_service_plan" "this" {
  name = provider::dx::resource_name({
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
    resource_type   = "app_service_plan"
  })
  location               = var.environment.location
  resource_group_name    = var.resource_group_name
  os_type                = "Linux"
  sku_name               = local.sku_name
  zone_balancing_enabled = local.zone_balancing_enabled

  tags = var.tags
}
