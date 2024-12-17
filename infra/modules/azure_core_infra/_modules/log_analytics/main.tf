resource "azurerm_log_analytics_workspace" "this" {
  name                = "${var.prefix}-common-log-${var.suffix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}