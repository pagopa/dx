# Generate available CIDR block for Container App subnet (/26 provides 64 addresses)
resource "dx_available_subnet_cidr" "container_app" {
  virtual_network_id = var.virtual_network_id
  prefix_length      = 26
}

# Dedicated subnet for Container App Environment and deployed Container Apps
resource "azurerm_subnet" "container_app" {
  name                 = provider::dx::resource_name(merge(local.environment_short, { resource_type = "subnet" }))
  resource_group_name  = var.virtual_network_resource_group_name
  virtual_network_name = var.virtual_network_name
  address_prefixes     = [dx_available_subnet_cidr.container_app.cidr_block]

  depends_on = []
}

# Container App Environment that hosts the deployed Container Apps
# ⚠️ Azure Container Apps is in trial status in the PagoPA DX Technology Radar
# Consider the operational and cost implications before using in production
resource "azurerm_container_app_environment" "this" {
  name                = provider::dx::resource_name(merge(local.environment_short, { resource_type = "container-app-environment" }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  infrastructure_subnet_id = azurerm_subnet.container_app.id
  tags                     = var.tags

  log_analytics_workspace_id = var.log_analytics_workspace_id

  depends_on = [azurerm_subnet.container_app]
}

# User-assigned managed identity for Container Apps to access Azure resources (e.g., Key Vault)
resource "azurerm_user_assigned_identity" "container_app" {
  name                = provider::dx::resource_name(merge(local.environment_short, { resource_type = "managed_identity", name = "container-app" }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  tags = var.tags
}

# Diagnostic settings for Container App Environment monitoring
resource "azurerm_monitor_diagnostic_setting" "container_app_environment" {
  name                       = "${azurerm_container_app_environment.this.name}-diagnostics"
  target_resource_id         = azurerm_container_app_environment.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "ContainerAppConsoleLogs"
  }

  enabled_log {
    category = "ContainerAppSystemLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }

  depends_on = [azurerm_container_app_environment.this]
}
