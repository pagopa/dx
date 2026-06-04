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

variable "container_app_environment_id" {
  type        = string
  description = "The ID of the Azure Container App Environment where the container app will be deployed."
}

variable "use_case" {
  type        = string
  description = "Container app use case. Allowed values: 'default', 'development'"
  default     = "default"

  validation {
    condition     = contains(["default", "development"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\", \"development\"."
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

variable "deployment_strategy" {
  type        = string
  default     = "Incremental"
  description = <<-EOT
  The strategy for new deployments.
  With `Incremental`, the new version the gradually deployed until it reaches the 100% of the traffic.
  Optionally, you can provide a script to monitor specific APIs during this phase and using automatic rollbacks in case of issues.
  With `Latest`, the new version immediately replaces the previous one as soon as it becomes responsive and required number of replicas are provisioned, with no gradual deployment.
  EOT

  validation {
    condition     = contains(["Latest", "Incremental"], var.deployment_strategy)
    error_message = "Valid values for deployment_strategy are \"Latest\" and \"Incremental\"."
  }
}

variable "container_port" {
  type        = number
  description = "The port on which the container app will listen for incoming traffic."
  default     = 8080
}

variable "allow_access_from_environment_only" {
  type        = bool
  default     = false
  description = <<-EOT
    If false (default), the Container App is accessible via public internet or within the VNet, depending on the Container App Environment configuration.
    If true, the Container App is accessible only from other apps on the same Container App Environment.
  EOT
}

variable "custom_domain" {
  type = object({
    host_name      = string
    certificate_id = optional(string)
    dns = optional(object({
      zone_name                = string
      zone_resource_group_name = string
    }))
  })
  default     = null
  description = "Custom domain configuration for the container app. Provide 'certificate_id' to use a pre-uploaded azurerm_container_app_environment_certificate, or 'dns' to auto-provision an Azure-managed certificate (CNAME and TXT records are created automatically). At least one of 'certificate_id' or 'dns' must be specified."

  validation {
    condition     = var.custom_domain == null || var.allow_access_from_environment_only == false
    error_message = "allow_access_from_environment_only must be false when custom_domain is configured."
  }

  validation {
    condition     = var.custom_domain == null || var.custom_domain.certificate_id != null || var.custom_domain.dns != null
    error_message = "At least one of 'certificate_id' or 'dns' must be provided in custom_domain. Provide 'certificate_id' to use a pre-uploaded certificate, 'dns' to auto-provision a managed certificate, or both to use a pre-uploaded certificate with automatic CNAME routing."
  }

  validation {
    condition     = var.custom_domain == null || var.custom_domain.dns == null || endswith(var.custom_domain.host_name, ".${var.custom_domain.dns.zone_name}")
    error_message = "custom_domain.host_name must be a subdomain of custom_domain.dns.zone_name (e.g., api.example.com within zone example.com)."
  }

  validation {
    condition     = var.custom_domain == null || var.custom_domain.dns == null || var.custom_domain.host_name != var.custom_domain.dns.zone_name
    error_message = "Apex domains (where host_name equals zone_name) are not supported. Managed certificates require a subdomain (e.g., api.example.com)."
  }
}

variable "authentication" {
  type = object({
    azure_active_directory = object({
      client_id                  = string
      tenant_id                  = string
      client_secret_key_vault_id = string
    })
  })
  default     = null
  description = "Azure Managed Authentication (EasyAuth) configuration using Microsoft Entra ID. When set, enables authentication on the Container App. Unauthenticated requests get redirected to the login page. client_secret_key_vault_id must be the versionless_id of the KV secret; the module automatically adds it to the Container App secrets."

  validation {
    condition     = var.authentication == null || startswith(var.authentication.azure_active_directory.client_secret_key_vault_id, "https://")
    error_message = "authentication.azure_active_directory.client_secret_key_vault_id must be a valid Azure Key Vault secret URI (must start with 'https://')."
  }
}

variable "secrets" {
  type = list(object({
    name                = string
    key_vault_secret_id = string
  }))
  default     = []
  description = <<-EOT
  List of Key Vault secret references to define in the Container App.
  Secrets are exposed to containers only when explicitly referenced in `containers[*].secret_names`.
  To remove a secret without downtime, first deploy the application version that no longer needs it, then remove it from every container `secret_names` list, and finally remove it from `secrets`.
  EOT
}

variable "containers" {
  type = list(object({
    image        = string
    name         = optional(string, "")
    app_settings = optional(map(string), {})
    secret_names = optional(list(string), [])

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

  description = <<-EOT
  List of containers and related settings to be deployed in the same Container App.
  The second and subsequent containers in the list will be deployed as sidecars.
  Each container must specify an image, and can optionally specify a name (if not provided, a name will be generated from the image name), environment variables (app_settings), secrets to be exposed (secret_names) and liveness, readiness and startup probes.
  Probes are used by Azure to determine container health status and to automatically restart it if necessary.
  For more details on probe configuration, refer to https://learn.microsoft.com/en-us/azure/container-apps/containers#probes.
  EOT

  validation {
    condition     = alltrue([for template in var.containers : contains(["HTTP", "TCP", "HTTPS"], template.liveness_probe.transport)])
    error_message = "Valid values for liveness_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }

  # as Terraform does not support lazy evaluation, a ternary operator is necessary to avoid crash on null values
  validation {
    condition = alltrue([
      for template in var.containers :
      template.readiness_probe == null ? true : contains(["HTTP", "TCP", "HTTPS"], template.readiness_probe.transport)
    ])
    error_message = "Valid values for readiness_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }

  validation {
    condition = alltrue([
      for template in var.containers :
      template.startup_probe == null ? true : contains(["HTTP", "TCP", "HTTPS"], template.startup_probe.transport)
    ])
    error_message = "Valid values for startup_probe transport are `HTTP`, `TCP` and `HTTPS`."
  }
}

variable "user_assigned_identity_id" {
  type        = string
  default     = null
  description = <<-EOT
    Id of a user-assigned managed identity.
    If provided, the Container App will use this identity along with the system-assigned.
  EOT
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

variable "log_analytics_workspace_id" {
  type        = string
  default     = null
  description = <<-EOT
    The ID of the Log Analytics workspace to send diagnostics to.
    Mandatory for use cases other than 'development'.
  EOT

  validation {
    condition     = var.use_case == "development" || var.log_analytics_workspace_id != null
    error_message = "log_analytics_workspace_id must be provided when use_case is not set to 'development'."
  }
}
