# ------------ GENERAL ------------ #
variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
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
  description = "The name of the Azure Resource Group where the resources will be deployed."
}
# ------------ CONTAINER ENVIRONMENT ------------ #

variable "container_app_environment_id" {
  type        = string
  description = "The ID of the Azure Container App Environment where the container app will be deployed."
}

# ------------ CONTAINER APP ------------ #

variable "use_case" {
  type        = string
  description = "Container app use case. Allowed values: 'default'."
  default     = "default"

  validation {
    condition     = contains(["default"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\"."
  }
}

variable "size" {
  type = object({
    cpu    = number
    memory = string
  })
  default     = null
  description = "Container app memory and cpu sizes. For allowed values consult table at https://learn.microsoft.com/en-us/azure/container-apps/containers#allocations. If not set, it will be determined by the use_case."

  validation {
    condition = var.size == null || (
      var.size.cpu >= 0.25 &&
      var.size.cpu <= 4 &&
      floor(var.size.cpu / 0.25) == var.size.cpu / 0.25 && # multiple of 0.25
      var.size.memory == "${var.size.cpu * 2}Gi"
    )
    error_message = "CPU must be between 0.25 and 4 in steps of 0.25, and memory must equal cpu*2 (e.g. 0.25→0.5Gi, 1→2Gi, 4→8Gi)."
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
  description = "The port on which the container app will listen for incoming traffic."
  default     = 8080
}

variable "secrets" {
  type = list(object({
    name                = string
    key_vault_secret_id = string
  }))
  default     = []
  description = "A list of Key Vault secret references to be used as environment variables in the container app."
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
      initial_delay           = optional(number, 30)
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

  validation {
    condition = alltrue([
      for template in var.container_app_templates :
      template.startup_probe == null ? true : contains(["HTTP", "TCP", "HTTPS"], template.startup_probe.transport)
    ])
    error_message = "Valid values for startup_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }
}

variable "user_assigned_identity_id" {
  type        = string
  description = "Id of the user-assigned managed identity created along with the Container App Environment. This is necessary to give identity roles (e.g. KeyVault access) to the Container App."
}

variable "acr_registry" {
  type        = string
  default     = null
  description = "Indicates the Azure Container Registry to pull images from. Use this variable only if the registry service is an Azure Container Registry. Value must match the registry specified in the image name."
}

variable "autoscaler" {
  type = object({
    replicas = optional(object({
      minimum = number
      maximum = number
    }), null)

    azure_queue_scalers = optional(list(object({
      queue_name   = string
      queue_length = number

      authentication = object({
        secret_name       = string
        trigger_parameter = string
      })
    })), [])

    http_scalers = optional(list(object({
      name                = string
      concurrent_requests = number,
    })), [])

    custom_scalers = optional(list(object({
      name             = string
      custom_rule_type = string
      metadata         = map(string),

      authentication = optional(object({
        secret_name       = string
        trigger_parameter = string
      }))
    })), [])
  })

  default     = null
  description = "Autoscaler configuration. It includes minimum and maximum replicas, and a list of scalers for Azure Queue, HTTP calls and Custom scaling rules. Custom scalers are available on Keda website at https://keda.sh/docs/latest/scalers/"

  validation {
    condition     = var.autoscaler == null || var.autoscaler.replicas == null || (var.autoscaler.replicas.minimum >= 0 && var.autoscaler.replicas.maximum >= var.autoscaler.replicas.minimum && var.autoscaler.replicas.maximum > 0)
    error_message = "Replicas minimum must be >= 0 and maximum must be >= minimum, but never 0."
  }

}

variable "function_settings" {
  type = object({
    key_vault_name                           = string
    application_insights_connection_string   = string
    application_insights_sampling_percentage = optional(number, 5)
    has_durable_functions                    = optional(bool, false)
    subnet_pep_id                            = string
    private_dns_zone_resource_group_id       = string
    action_group_ids                         = optional(set(string), [])
  })
  default = null
}
