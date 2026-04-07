variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located"
  type        = string
}

variable "redis" {
  description = "A list of Redis role assignments"
  type = list(object({
    cache_name          = string
    resource_group_name = string
    role                = optional(string, null)
    username            = optional(string, null)
    description         = string
    is_managed          = optional(bool, false)
  }))

  validation {
    condition = alltrue([
      for assignment in var.redis : assignment.is_managed ? true : (
        assignment.role != null && contains(["reader", "writer", "owner"], lower(assignment.role))
      )
    ])
    error_message = "For legacy Redis assignments (is_managed=false), role must be set either to \"reader\", \"writer\" or \"owner\". For Azure Managed Redis assignments, role is optional and ignored."
  }

  validation {
    condition     = length(var.redis) == length(distinct(var.redis))
    error_message = "Each assignment must be unique. Found ${length(var.redis) - length(distinct(var.redis))} duplicates."
  }

  default = []
}
