data "azurerm_eventhub_namespace" "this" {
  for_each            = { for namespace in local.namespaces : "${namespace.resource_group_name}|${namespace.namespace_name}" => namespace if namespace.namespace_name == null }
  name                = each.value.namespace_name
  resource_group_name = each.value.resource_group_name
}
