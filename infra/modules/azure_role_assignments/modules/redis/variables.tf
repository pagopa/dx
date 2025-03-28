variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "redis" {
  description = "A list of Redis role assignments"
  type = list(object({
    cache_name          = string
    resource_group_name = string
    role                = string
    username            = string
    description         = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.redis : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.redis) == length(distinct(var.redis))
    error_message = "Each assignment must be unique. Found ${length(var.redis) - length(distinct(var.redis))} duplicates."
  }

  default = []
}
