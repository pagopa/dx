variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "storage_table" {
  description = "A list of storage table role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    table_name           = optional(string, "*")
    role                 = string
  }))

  default = []
}


variable "storage_blob" {
  description = "A list of storage blob role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    container_name       = optional(string, "*")
    role                 = string
  }))

  default = []
}

variable "storage_queue" {
  description = "A list of storage queue role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    queue_name           = optional(string, "*")
    role                 = string
  }))

  default = []
}