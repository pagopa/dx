output "azurerm_role_assignment" {
  value = {
    queues        = azurerm_role_assignment.queues
    topics        = azurerm_role_assignment.topics
    subscriptions = azurerm_role_assignment.subscriptions
  }
}
