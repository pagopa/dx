variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located"
  type        = string
}

variable "service_bus" {
  description = "A list of Service Bus role assignments"
  type = list(object({
    namespace_name      = string
    resource_group_name = string
    queue_names         = optional(list(string), [])
    topic_names         = optional(list(string), [])
    subscriptions       = optional(map(string), {}) # Terraform processes map literals with duplicate keys by taking the last defined instance.
    role                = string
    description         = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.service_bus : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition = length([
      for assignment in flatten([
        for entry in var.service_bus : [
          for queue_name in entry.queue_names : {
            namespace_name      = entry.namespace_name
            resource_group_name = entry.resource_group_name
            role                = entry.role
            queue_name          = queue_name
          }
        ]
      ]) : assignment
      ]) == length(distinct([
        for assignment in flatten([
          for entry in var.service_bus : [
            for queue_name in entry.queue_names : {
              namespace_name      = entry.namespace_name
              resource_group_name = entry.resource_group_name
              role                = entry.role
              queue_name          = queue_name
            }
          ]
        ]) : assignment
    ]))
    error_message = "Each queue assignment must be unique."
  }

  validation {
    condition = length([
      for assignment in flatten([
        for entry in var.service_bus : [
          for topic_name in entry.topic_names : {
            namespace_name      = entry.namespace_name
            resource_group_name = entry.resource_group_name
            role                = entry.role
            topic_name          = topic_name
          }
        ]
      ]) : assignment
      ]) == length(distinct([
        for assignment in flatten([
          for entry in var.service_bus : [
            for topic_name in entry.topic_names : {
              namespace_name      = entry.namespace_name
              resource_group_name = entry.resource_group_name
              role                = entry.role
              topic_name          = topic_name
            }
          ]
        ]) : assignment
    ]))
    error_message = "Each topic assignment must be unique."
  }

  default = []
}
