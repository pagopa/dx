locals {
  cae_name = provider::dx::resource_name(merge(var.naming_config, {
    resource_type = "container_app_environment",
  }))
}

resource "azurerm_container_app_environment" "cae" {
  name                = local.cae_name
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
  name       = local.cae_name
  notes      = "This Container App Environment cannot be deleted"
  scope      = azurerm_container_app_environment.cae.id
}
