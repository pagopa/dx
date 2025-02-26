variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "key_vault" {
  description = "A list of key vault role assignments"
  type = list(object({
    name                = optional(string, null)
    id                  = optional(string, null)
    has_rbac_support    = optional(bool, null)
    resource_group_name = optional(string, null)
    roles = object({
      secrets      = optional(string, "")
      certificates = optional(string, "")
      keys         = optional(string, "")
    })

    override_roles = optional(object({
      secrets      = optional(list(string), [])
      certificates = optional(list(string), [])
      keys         = optional(list(string), [])
      }), {
      secrets      = []
      certificates = []
      keys         = []
    })
  }))

  validation {
    condition = alltrue([
      for kv_item in var.key_vault :
      (
        (kv_item.name != null && kv_item.resource_group_name != null)
        || (kv_item.id != null && kv_item.has_rbac_support != null)
      )
    ])

    error_message = <<EOT
Each object in "key_vault" must either specify both 'name' and 'resource_group_name',
or both 'id' and 'has_rbac_support' must be set (non-null).
EOT
  }

  validation {
    condition = alltrue([
      for assignment in var.key_vault : contains(["reader", "writer", "owner", ""], try(assignment.roles.secrets, "")) && contains(["reader", "writer", "owner", ""], try(assignment.roles.certificates, "")) && contains(["reader", "writer", "owner", ""], try(assignment.roles.keys, ""))
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.key_vault) == length(distinct(var.key_vault))
    error_message = "Each assignment must be unique. Found ${length(var.key_vault) - length(distinct(var.key_vault))} duplicates."
  }

  default = []
}