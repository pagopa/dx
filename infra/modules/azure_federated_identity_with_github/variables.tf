variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "identity_type" {
  type        = string
  default     = "infra"
  description = "Scope of the identities to create"

  validation {
    condition     = contains(["infra", "opex", "app"], var.identity_type)
    error_message = "Supported values are \"infra\", \"opex\" and \"app\""
  }
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })
  description = "Repositories to federate"
}

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
  type        = string
  description = "Id of the current subscription"
}
