locals {
  assignments = {
    for assignment in flatten([
      for entry in var.event_hub : [
        for event_hub_name in entry.event_hub_names : {
          namespace_name      = provider::azurerm::parse_resource_id(entry.namespace_id)["resource_name"]
          namespace_id        = entry.namespace_id
          resource_group_name = provider::azurerm::parse_resource_id(entry.namespace_id)["resource_group_name"]
          role                = entry.role
          event_hub_name      = event_hub_name
          event_hub_id        = "${entry.namespace_id}/eventhubs/${event_hub_name}"
        }
      ]
    ]) : "${provider::azurerm::parse_resource_id(assignment.namespace_id)["resource_name"]}|${assignment.event_hub_name}|${assignment.role}" => assignment
  }

  role_definition_name = {
    reader = "Azure Event Hubs Data Receiver"
    writer = "Azure Event Hubs Data Sender"
    owner  = "Azure Event Hubs Data Owner"
  }
}