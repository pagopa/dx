data "azurerm_subscription" "current" {}

# --------------------------------------
# Azure Automation Account
# --------------------------------------

resource "azurerm_automation_account" "save_money" {
  name                = "dx-d-itn-save-money-poc-aa-01"
  location            = local.naming_config.location
  resource_group_name = local.resource_group_name
  sku_name            = "Basic"

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "reader_role" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Reader"
  principal_id         = azurerm_automation_account.save_money.identity[0].principal_id
}

# --------------------------------------
# Variables
# --------------------------------------
resource "azurerm_automation_variable_string" "tenant_id" {
  name                    = "TenantId"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name
  value                   = data.azurerm_subscription.current.tenant_id
  encrypted               = false
}

resource "azurerm_automation_variable_string" "automation_account_id" {
  name                    = "AutomationAccountResourceId"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name
  value                   = azurerm_automation_account.save_money.id
  encrypted               = false
}

# resource "azurerm_automation_variable_bool" "always_only_mark" {
#   name                    = "AlwaysOnlyMarkForDeletion"
#   resource_group_name     = local.resource_group_name
#   automation_account_name = azurerm_automation_account.save_money.name
#   value                   = true
#   encrypted               = false
# }

# resource "azurerm_automation_variable_bool" "enable_reset_rejected" {
#   name                    = "EnableRegularResetOfRejectedState"
#   resource_group_name     = local.resource_group_name
#   automation_account_name = azurerm_automation_account.save_money.name
#   value                   = true
#   encrypted               = false
# }

resource "azurerm_automation_variable_string" "subscription_ids" {
  name                    = "SubscriptionIdsToProcess"
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name
  value                   = data.azurerm_subscription.current.subscription_id
  encrypted               = false
}