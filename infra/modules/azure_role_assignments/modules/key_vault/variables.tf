variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "key_vault" {
  description = "A list of key vault role assignments. The description is set only for rbac supported key vaults."
  type = list(object({
    name               = string
    resource_group_name = string
    has_rbac_support = optional(bool, true)
    description      = string
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
