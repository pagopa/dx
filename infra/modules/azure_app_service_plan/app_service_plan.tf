resource "azurerm_service_plan" "this" {
  name                   = "${var.naming.prefix}-asp-${var.naming.suffix}"
  location               = var.location
  resource_group_name    = var.resource_group_name
  os_type                = "Linux"
  sku_name               = local.sku_name
  zone_balancing_enabled = local.zone_balancing_enabled

  tags = var.tags
}
