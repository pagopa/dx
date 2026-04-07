variable "principal_id" {
  description = "The ID of the principal to which assign roles"
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
  default = []
}
