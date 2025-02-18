variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "env_short" {
  type        = string
  description = "Environment short name"
}

variable "env" {
  type        = string
  description = "Environment name"
}

variable "prefix" {
  type        = string
  description = "Project prefix"
}

variable "resource_group_name" {
  type = string
  default = null
  description = "(Optional) Override default resource group"
}

variable "location" {
  type        = string
  description = "Azure region for the Managed Identity"
  default     = "italynorth"
}

variable "domain" {
  type        = string
  default     = ""
  description = "(Optional) Domain of the project"
}

variable "repositories" {
  type        = list(string)
  description = "List of repositories to federate"
}

# variable "identity_role" {
#   type = string
#   description = "Kind of identity"

#   validation {
#     condition = contains(["ci", "cd"], var.identity_role)
#     error_message = "Values accepted are \"ci\" and \"cd\""
#   }
# }

variable "continuos_integration" {
  type = object({
    enable = bool
    roles = optional(object({
      subscription    = set(string)
      resource_groups = map(list(string))
    }))
  })

  default = {
    enable = true
    roles = {
      subscription = [
        "Reader",
        "Reader and Data Access",
        "PagoPA IaC Reader",
        "DocumentDB Account Contributor",
        "PagoPA API Management Service List Secrets"
      ]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
      }
    }
  }

  description = "Continuos Integration identity properties, such as repositories to federated with and RBAC roles"
}

variable "continuos_delivery" {
  type = object({
    enable = bool
    roles = optional(object({
      subscription    = set(string)
      resource_groups = map(list(string))
    }))
  })

  default = {
    enable = true
    roles = {
      subscription = ["Contributor"]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
      }
    }
  }

  description = "Continuos Delivery identity properties, such as repositories to federated with and RBAC roles"
}

variable "subscription_id" {
  type = string
  description = "Id of the current subscription"
}
