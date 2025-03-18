variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "event_hub" {
  description = "A list of event hub role assignments"
  type = list(object({
    namespace_id    = string
    event_hub_names = optional(list(string), ["*"])
    role            = string
    description     = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.event_hub : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition = length([
      for assignment in flatten([
        for entry in var.event_hub : [
          for event_hub_name in entry.event_hub_names : {
            namespace_id   = entry.namespace_id
            role           = entry.role
            event_hub_name = event_hub_name
          }
        ]
      ]) : assignment
      ]) == length(distinct([
        for assignment in flatten([
          for entry in var.event_hub : [
            for event_hub_name in entry.event_hub_names : {
              namespace_id   = entry.namespace_id
              role           = entry.role
              event_hub_name = event_hub_name
            }
          ]
        ]) : assignment
    ]))
    error_message = "Each assignment must be unique."
  }

  default = []
}