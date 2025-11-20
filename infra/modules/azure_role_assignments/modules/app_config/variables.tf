variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located"
  type        = string
}

variable "app_config" {
  description = "A list of App Configuration role assignments"
  type = list(object({
    name                = string
    resource_group_name = string
    role                = string
    description         = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.app_config : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.app_config) == length(distinct(var.app_config))
    error_message = "Each assignment must be unique. Found ${length(var.app_config) - length(distinct(var.app_config))} duplicates."
  }

  default = []
}
