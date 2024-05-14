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
      id   = azurerm_service_plan.this.id
      name = azurerm_service_plan.this.name
    }
    function_app = {
      id   = azurerm_linux_function_app.this.id
      name = azurerm_linux_function_app.this.name
      slot = {
        name = azurerm_linux_function_app_slot.this.name
      }
    }
  }
}
