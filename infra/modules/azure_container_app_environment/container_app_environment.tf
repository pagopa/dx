resource "azurerm_container_app_environment" "this" {
  name                = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_environment" }))
  location            = var.environment.location
  resource_group_name = var.resource_group_name

  identity {
    type = "SystemAssigned"
  }

  infrastructure_subnet_id       = azurerm_subnet.this.id
  internal_load_balancer_enabled = !var.networking.public_network_access_enabled
  logs_destination               = "azure-monitor"
  zone_redundancy_enabled        = local.use_case_features.zone_redundancy_enabled

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name,
    ]
  }

  timeouts {
    create = "60m"
  }

  tags = local.tags
}

resource "azurerm_management_lock" "cae_lock" {
  count = local.use_case_features.lock_enabled ? 1 : 0

  name       = azurerm_container_app_environment.this.name
  scope      = azurerm_container_app_environment.this.id
  lock_level = "CanNotDelete"

  notes = "Lock for the Container App Environment"

  depends_on = [
    azurerm_monitor_diagnostic_setting.cae
  ]
}
