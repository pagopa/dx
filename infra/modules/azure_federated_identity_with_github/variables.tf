variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })

  description = "Environment-specific values used to generate resource names and location short names."
}

variable "tags" {
  type        = map(any)
  description = "Resources tags."
}

variable "identity_type" {
  type        = string
  default     = "infra"
  description = "Specifies the scope of the identities to create. Supported values are 'infra', 'opex', and 'app'."

  validation {
    condition     = contains(["infra", "opex", "app"], var.identity_type)
    error_message = "Supported values are 'infra', 'opex', and 'app'."
  }
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where resources will be deployed."
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })
  description = "Details of the GitHub repository to federate with. 'owner' defaults to 'pagopa' if not specified."
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

  description = "Continuos Integration (CI) identity properties, such as repositories to federated with and RBAC roles at the subscription and resource group levels."
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

  description = "Continuos Delivery (CD) identity properties, such as repositories to federated with and RBAC roles at the subscription and resource group levels."
}

variable "subscription_id" {
  type        = string
  description = "The ID of the Azure subscription where resources will be deployed."
}
