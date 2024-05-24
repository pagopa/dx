output "subnet" {
  value = {
    id   = azurerm_subnet.this.id
    name = azurerm_subnet.this.name
  }
}

output "storage_account" {
  value = {
    id   = azurerm_storage_account.this.id
    name = azurerm_storage_account.this.name
  }
}

output "function_app" {
  value = {
    resource_group_name = azurerm_linux_function_app.this.resource_group_name
    plan = {
      id   = try(azurerm_service_plan.this[0].id, "No App Service Plan for this Function App")
      name = try(azurerm_service_plan.this[0].name, "No App Service Plan for this Function App")
    }
    function_app = {
      id           = azurerm_linux_function_app.this.id
      name         = azurerm_linux_function_app.this.name
      principal_id = azurerm_linux_function_app.this.identity[0].principal_id
      slot = {
        id           = try(azurerm_linux_function_app_slot.this[0].id, "No slot for this Function App")
        name         = try(azurerm_linux_function_app_slot.this[0].name, "No slot for this Function App")
        principal_id = try(azurerm_linux_function_app_slot.this[0].identity[0].principal_id, "No slot for this Function App")
      }
    }
  }
}
