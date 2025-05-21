output "automation_account_name" {
  value = azurerm_automation_account.save_money.name
}

output "automation_account_resource_group" {
  value = local.resource_group_name
}

output "runbook_name" {
  value = azurerm_automation_runbook.save_money_script.name
}

output "automation_account_id" {
  value = azurerm_automation_account.save_money.id
}

output "managed_identity_principal_id" {
  value = azurerm_automation_account.save_money.identity[0].principal_id
}