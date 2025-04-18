output "subnet" {
  description = "Details of the subnet used, including its ID and name."
  value = {
    id   = try(azurerm_subnet.this[0].id, var.subnet_id)
    name = try(azurerm_subnet.this[0].name, null)
  }
}

output "app_service" {
  description = "Details of the App Service, including its resource group, plan, and slot information."
  value = {
    resource_group_name = azurerm_linux_web_app.this.resource_group_name
    plan = {
      id   = try(azurerm_service_plan.this[0].id, var.app_service_plan_id)
      name = try(azurerm_service_plan.this[0].name, null)
    }
    app_service = {
      id              = azurerm_linux_web_app.this.id
      name            = azurerm_linux_web_app.this.name
      principal_id    = azurerm_linux_web_app.this.identity[0].principal_id
      pep_record_sets = azurerm_private_endpoint.app_service_sites.private_dns_zone_configs[0].record_sets
      slot = {
        id              = try(azurerm_linux_web_app_slot.this[0].id, null)
        name            = try(azurerm_linux_web_app_slot.this[0].name, null)
        principal_id    = try(azurerm_linux_web_app_slot.this[0].identity[0].principal_id, null)
        pep_record_sets = try(azurerm_private_endpoint.staging_app_service_sites[0].private_dns_zone_configs[0].record_sets, null)
      }
    }
  }
}
