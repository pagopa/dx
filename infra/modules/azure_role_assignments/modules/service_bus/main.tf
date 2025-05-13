resource "azurerm_role_assignment" "queues" {
  for_each             = local.queue_assignments
  role_definition_name = local.role_definition_name[lower(each.value.role)]
  scope                = each.value.queue_id
  principal_id         = var.principal_id
  description          = each.value.description
}

resource "azurerm_role_assignment" "subscriptions" {
  for_each             = local.subscription_assignments
  role_definition_name = local.role_definition_name[lower(each.value.role)]
  scope                = each.value.subscription_id
  principal_id         = var.principal_id
  description          = each.value.description
}
