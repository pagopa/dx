# ------------ GENERAL ------------ #
variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}
# ------------ CONTAINER ENVIRONMENT ------------ #

variable "container_app_environment_id" {
  type        = string
  description = "The container app environemnt id."
}

# ------------ CONTAINER APP ------------ #

variable "tier" {
  type        = string
  description = "The offer type for the Container. Valid values are 'xs', 's', 'm' and 'l'."
  default     = "s"

  validation {
    condition     = contains(["xs", "s", "m", "l"], var.tier)
    error_message = "Valid values for tier are 'xs', 's', 'm' and 'l'."
  }
}

variable "revision_mode" {
  type        = string
  description = "The revision mode for the container app. Valid values are 'Single' and 'Multiple'."
  default     = "Multiple"

  validation {
    condition     = contains(["Single", "Multiple"], var.revision_mode)
    error_message = "Valid values for revision_mode are 'Single' and 'Multiple'."
  }
}

variable "target_port" {
  type        = number
  description = "The target port for the Container App."
  default     = 8080
}

variable "secrets" {
  type = list(object({
    name                = string
    key_vault_secret_id = string
  }))
  default     = []
  description = "Key Vault secret references to be used in all the containers of this Container App."
}

variable "container_app_templates" {
  type = list(object({
    image        = string
    name         = optional(string, "")
    app_settings = optional(map(string), {})

    liveness_probe = object({
      failure_count_threshold = optional(number, 3)
      header = optional(object({
        name  = string
        value = string
      }))
      initial_delay    = optional(number, 30)
      interval_seconds = optional(number, 10)
      path             = string
      timeout          = optional(number, 5)
      transport        = optional(string, "HTTP")
    })

    readiness_probe = optional(object({
      failure_count_threshold = optional(number, 10)
      header = optional(object({
        name  = string
        value = string
      }))
      interval_seconds        = optional(number, 10)
      path                    = string
      success_count_threshold = optional(number, 3)
      timeout                 = optional(number, 5)
      transport               = optional(string, "HTTP")
    }), null)

    startup_probe = optional(object({
      failure_count_threshold = optional(number, 10)
      header = optional(object({
        name  = string
        value = string
      }))
      interval_seconds = optional(number, 10)
      path             = string
      timeout          = optional(number, 5)
      transport        = optional(string, "HTTP")
    }), null)
  }))

  description = "List of containers to be deployed in the Container App. Each container can have its own settings, including liveness, readiness and startup probes. The image name is mandatory, while the name is optional. If not provided, the image name will be used as the container name."

  validation {
    condition     = alltrue([for template in var.container_app_templates : contains(["HTTP", "TCP", "HTTPS"], template.liveness_probe.transport)])
    error_message = "Valid values for liveness_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }

  # as Terraform does not support lazy evaluation, a ternary operator is necessary to avoid crash on null values
  validation {
    condition = alltrue([
      for template in var.container_app_templates :
      template.readiness_probe == null ? true : contains(["HTTP", "TCP", "HTTPS"], template.readiness_probe.transport)
    ])
    error_message = "Valid values for readiness_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }

  # ditto
  validation {
    condition = alltrue([
      for template in var.container_app_templates :
      template.startup_probe == null ? true : contains(["HTTP", "TCP", "HTTPS"], template.startup_probe.transport)
    ])
    error_message = "Valid values for startup_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }
}
