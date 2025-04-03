variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located"
  type        = string
}

variable "storage_table" {
  description = "A list of storage table role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    table_name           = optional(string, "*")
    role                 = string
    description          = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.storage_table : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.storage_table) == length(distinct(var.storage_table))
    error_message = "Each assignment must be unique. Found ${length(var.storage_table) - length(distinct(var.storage_table))} duplicates."
  }

  default = []
}

variable "storage_blob" {
  description = "A list of storage blob role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    container_name       = optional(string, "*")
    role                 = string
    description          = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.storage_blob : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.storage_blob) == length(distinct(var.storage_blob))
    error_message = "Each assignment must be unique. Found ${length(var.storage_blob) - length(distinct(var.storage_blob))} duplicates."
  }

  default = []
}

variable "storage_queue" {
  description = "A list of storage queue role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    queue_name           = optional(string, "*")
    role                 = string
    description          = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.storage_queue : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.storage_queue) == length(distinct(var.storage_queue))
    error_message = "Each assignment must be unique. Found ${length(var.storage_queue) - length(distinct(var.storage_queue))} duplicates."
  }

  default = []
}
