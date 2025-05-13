output "azurerm_role_assignment" {
  value = {
    queues        = azurerm_role_assignment.queues
    subscriptions = azurerm_role_assignment.subscriptions
  }
}
