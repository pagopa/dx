locals {
  namespaces = distinct([for assignment in var.event_hub : { namespace_name = assignment.namespace_name, resource_group_name = assignment.resource_group_name } if assignment.namespace_id == null ])

  assignments = {
    for assignment in flatten([
      for entry in var.event_hub : [
        for event_hub_name in entry.event_hub_names : {
          namespace_name      = entry.namespace_name
          namespace_id        = coalesce(entry.namespace_id, data.azurerm_eventhub_namespace.this["${entry.resource_group_name}|${entry.namespace_name}"].id)
          resource_group_name = entry.resource_group_name
          role                = entry.role
          event_hub_name      = event_hub_name
          event_hub_id        = "${coalesce(entry.namespace_id, data.azurerm_eventhub_namespace.this["${entry.resource_group_name}|${entry.namespace_name}"].id)}/eventhubs/${event_hub_name}"
        }
      ]
    ]) : "${assignment.namespace_name}|${assignment.event_hub_name}|${assignment.role}" => assignment
  }

  role_definition_name = {
    reader = "Azure Event Hubs Data Receiver"
    writer = "Azure Event Hubs Data Sender"
    owner  = "Azure Event Hubs Data Owner"
  }
}