locals {
  assignments = {
    for assignment in flatten([
      for entry in var.event_hub : [
        for event_hub_name in entry.event_hub_names : {
          namespace_name      = entry.namespace_name
          namespace_id        = "/subscriptions/${var.subscription_id}/resourceGroups/${entry.resource_group_name}/providers/Microsoft.EventHub/namespaces/${entry.namespace_name}"
          resource_group_name = entry.resource_group_name
          role                = entry.role
          event_hub_name      = event_hub_name
          event_hub_id        = "${entry.namespace_id}/eventhubs/${event_hub_name}"
          description         = entry.description
        }
      ]
    ]) : "${"/subscriptions/${var.subscription_id}/resourceGroups/${assignment.resource_group_name}/providers/Microsoft.EventHub/namespaces/${assignment.namespace_name}"}|${assignment.event_hub_name}|${assignment.role}" => assignment
  }

  role_definition_name = {
    reader = "Azure Event Hubs Data Receiver"
    writer = "Azure Event Hubs Data Sender"
    owner  = "Azure Event Hubs Data Owner"
  }
}
