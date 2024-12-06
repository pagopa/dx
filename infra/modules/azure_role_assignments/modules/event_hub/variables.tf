variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "event_hub" {
  type = list(object({
    namespace_name      = optional(string)
    namespace_id        = optional(string)
    resource_group_name = string
    event_hub_names     = optional(list(string))
    event_hub_ids       = optional(list(string))
    role                = string
  }))

  description = <<EOT
  List of Event Hub configurations for role assignments.
  For existing Event Hubs:
    - Provide namespace_name and event_hub_names
  For new Event Hubs being created concurrently:
    - Provide namespace_id and event_hub_ids
  Each object should contain:
  - namespace_name: (Optional) The name of an existing Event Hub Namespace
  - namespace_id: (Optional) The full resource ID of a new Event Hub Namespace
  - resource_group_name: The name of the Resource Group
  - event_hub_names: (Optional) A list of existing Event Hub names within the Namespace
  - event_hub_ids: (Optional) A list of full resource IDs for new Event Hubs
  - role: The role to assign (must be one of "reader", "writer", or "owner")
  EOT

  validation {
    condition = alltrue([
      for eh in var.event_hub : contains(["reader", "writer", "owner"], eh.role)
    ])
    error_message = "The 'role' must be one of 'reader', 'writer', or 'owner'."
  }

  validation {
    condition = alltrue([
      for eh in var.event_hub : (eh.namespace_name != null) != (eh.namespace_id != null)
    ])
    error_message = "Provide either 'namespace_name' for existing namespaces or 'namespace_id' for new namespaces, but not both."
  }

  validation {
    condition = alltrue([
      for eh in var.event_hub : (eh.event_hub_names != null) != (eh.event_hub_ids != null)
    ])
    error_message = "Provide either 'event_hub_names' for existing Event Hubs or 'event_hub_ids' for new Event Hubs, but not both."
  }
}
