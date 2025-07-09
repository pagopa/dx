resource "azurerm_application_insights" "appi" {
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "common",
      resource_type = "application_insights",
  }))
  location             = var.location
  resource_group_name  = var.resource_group_name
  disable_ip_masking   = true
  application_type     = "other"
  daily_data_cap_in_gb = var.daily_data_cap_in_gb

  workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}

#tfsec:ignore:AZU023
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "appinsights_instrumentation_key" {
  name         = "appinsights-instrumentation-key"
  value        = azurerm_application_insights.appi.instrumentation_key
  content_type = "Application insights instrumentation key for ${azurerm_application_insights.appi.name}"

  key_vault_id = var.key_vault_id
}
