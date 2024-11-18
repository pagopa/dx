data "azurerm_eventhub_namespace" "this" {
  for_each            = { for namespace in local.namespaces : "${namespace.resource_group_name}|${namespace.namespace_name}" => namespace }
  name                = each.value.namespace_name
  resource_group_name = each.value.resource_group_name
}

data "azurerm_eventhub" "this" {
  for_each            = { for event_hub in local.event_hubs : "${event_hub.namespace_name}|${event_hub.event_hub_name}" => event_hub if event_hub.event_hub_name != "*" }
  name                = each.value.event_hub_name
  namespace_name      = each.value.namespace_name
  resource_group_name = each.value.resource_group_name
}
