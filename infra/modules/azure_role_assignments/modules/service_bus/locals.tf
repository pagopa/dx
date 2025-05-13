locals {
  queue_assignments = {
    for assignment in flatten([
      for entry in var.service_bus : [
        for queue_name in entry.queue_names : {
          namespace_name      = entry.namespace_name
          resource_group_name = entry.resource_group_name
          role                = entry.role
          queue_name          = queue_name
          queue_id            = "/subscriptions/${var.subscription_id}/resourceGroups/${entry.resource_group_name}/providers/Microsoft.ServiceBus/namespaces/${entry.namespace_name}/queues/${queue_name}"
          description         = entry.description
        }
      ]
    ]) : "${"/subscriptions/${var.subscription_id}/resourceGroups/${assignment.resource_group_name}/providers/Microsoft.ServiceBus/namespaces/${assignment.namespace_name}"}|${assignment.queue_name}|${assignment.role}" => assignment
  }

  topic_assignments = {
    for assignment in flatten([
      for entry in var.service_bus : [
        for topic_name in entry.topic_names : {
          namespace_name      = entry.namespace_name
          resource_group_name = entry.resource_group_name
          role                = entry.role
          topic_name          = topic_name
          topic_id            = "/subscriptions/${var.subscription_id}/resourceGroups/${entry.resource_group_name}/providers/Microsoft.ServiceBus/namespaces/${entry.namespace_name}/topics/${topic_name}"
          description         = entry.description
        }
      ]
    ]) : "${"/subscriptions/${var.subscription_id}/resourceGroups/${assignment.resource_group_name}/providers/Microsoft.ServiceBus/namespaces/${assignment.namespace_name}"}|${assignment.topic_name}|${assignment.role}" => assignment
  }

  subscription_assignments = {
    for assignment in flatten([
      for entry in var.service_bus : [
        for topic_name, subscription_name in entry.subscriptions : {
          namespace_name      = entry.namespace_name
          resource_group_name = entry.resource_group_name
          role                = entry.role
          topic_name          = topic_name
          subscription_name   = subscription_name
          subscription_id     = "/subscriptions/${var.subscription_id}/resourceGroups/${entry.resource_group_name}/providers/Microsoft.ServiceBus/namespaces/${entry.namespace_name}/topics/${topic_name}/subscriptions/${subscription_name}"
          description         = entry.description
        }
      ]
    ]) : "${"/subscriptions/${var.subscription_id}/resourceGroups/${assignment.resource_group_name}/providers/Microsoft.ServiceBus/namespaces/${assignment.namespace_name}"}|${assignment.topic_name}|${assignment.subscription_name}|${assignment.role}" => assignment
  }

  role_definition_name = {
    reader = "Azure Service Bus Data Receiver"
    writer = "Azure Service Bus Data Sender"
    owner  = "Azure Service Bus Data Owner"
  }
}
