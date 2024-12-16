resource "azurerm_container_app_environment" "cae" {
  name                = "${var.prefix}-cae-${var.suffix}"
  location            = var.location
  resource_group_name = var.resource_group_name

  log_analytics_workspace_id = var.log_analytics_workspace_id

  infrastructure_subnet_id       = azurerm_subnet.runner_snet.id
  zone_redundancy_enabled        = false
  internal_load_balancer_enabled = false

  tags = var.tags
}

resource "azurerm_management_lock" "lock_cae" {
  lock_level = "CanNotDelete"
  name       = "${var.prefix}-cae-${var.suffix}"
  notes      = "This Container App Environment cannot be deleted"
  scope      = azurerm_container_app_environment.cae.id
}