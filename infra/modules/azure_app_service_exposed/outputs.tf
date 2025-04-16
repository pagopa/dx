output "app_service" {
  description = "Details of the App Service, including its resource group, plan, and slot information."
  value = {
    resource_group_name = azurerm_linux_web_app.this.resource_group_name
    plan = {
      id   = try(azurerm_service_plan.this[0].id, null)
      name = try(azurerm_service_plan.this[0].name, null)
    }
    app_service = {
      id           = azurerm_linux_web_app.this.id
      name         = azurerm_linux_web_app.this.name
      principal_id = azurerm_linux_web_app.this.identity[0].principal_id
      slot = {
        id           = try(azurerm_linux_web_app_slot.this[0].id, null)
        name         = try(azurerm_linux_web_app_slot.this[0].name, null)
        principal_id = try(azurerm_linux_web_app_slot.this[0].identity[0].principal_id, null)
      }
    }
  }
}
