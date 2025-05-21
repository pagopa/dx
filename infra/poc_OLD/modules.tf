# --------------------------------------
# Upload script as resource
# --------------------------------------
resource "azurerm_automation_module" "az_accounts" {
  name                    = "Az.Accounts"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.Accounts/5.0.0"
  }
}

resource "azurerm_automation_module" "az_resources" {
  name                    = "Az.Resources"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.Resources/8.0.0"
  }

  depends_on = [azurerm_automation_module.az_accounts]
}

resource "azurerm_automation_module" "az_automation" {
  name                    = "Az.Automation"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.Automation/1.11.1"
  }

  depends_on = [azurerm_automation_module.az_accounts]
}

# Other required Az modules
resource "azurerm_automation_module" "az_batch" {
  name                    = "Az.Batch"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.Batch/3.7.0"
  }

  depends_on = [azurerm_automation_module.az_accounts]
}

resource "azurerm_automation_module" "az_monitor" {
  name                    = "Az.Monitor"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.Monitor/6.0.2"
  }

  depends_on = [azurerm_automation_module.az_accounts]
}

resource "azurerm_automation_module" "az_data_protection" {
  name                    = "Az.DataProtection"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.DataProtection/2.7.0"
  }

  depends_on = [azurerm_automation_module.az_accounts]
}

resource "azurerm_automation_module" "az_resource_graph" {
  name                    = "Az.ResourceGraph"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.ResourceGraph/1.2.1"
  }

  depends_on = [
    azurerm_automation_module.az_accounts,
    azurerm_automation_module.az_resources,
    # azurerm_automation_module.package_management
  ]
}

resource "azurerm_automation_module" "az_service_bus" {
  name                    = "Az.ServiceBus"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name

  module_link {
    uri = "https://www.powershellgallery.com/api/v2/package/Az.ServiceBus/4.1.1"
  }

  depends_on = [azurerm_automation_module.az_accounts]
}

# resource "azurerm_automation_module" "package_management" {
#   name                    = "PackageManagement"
#   resource_group_name     = local.resource_group_name
#   automation_account_name = azurerm_automation_account.save_money.name

#   module_link {
#     uri = "https://www.powershellgallery.com/api/v2/package/PackageManagement/1.4.8.1"
#   }

#   depends_on = [azurerm_automation_module.powershell_get]
# }