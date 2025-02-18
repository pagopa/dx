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

variable "create_container_app_environment" {
  type        = bool
  description = "Determines whether to create a new Container App Environment"
  default     = false
}

variable "container_app_environment_id" {
  type        = string
  description = "The ID of the container app environment to deploy the container app to. If not provided, a new container app environment will be created."
  default     = null
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to use for the container app environment."
  default     = null

  validation {
    condition     = var.create_container_app_environment == false || var.log_analytics_workspace_id != null
    error_message = "Please specify the log_analytics_workspace_id when create_container_app_environment is true"
  }
}

# ------------ CONTAINER APP ------------ #

variable "tier" {
  type        = string
  description = "The offer type for the Container. Valid values are 's', 'm', 'l' and 'xl'."
  default     = "s"

  validation {
    condition     = contains(["s", "m", "l", "xl"], var.tier)
    error_message = "Valid values for tier are 's', 'm', 'l' and 'xl'."
  }
}

variable "container_app_template" {
  type = object({
    image        = string
    name         = optional(string, "")
    app_settings = optional(map(string), {})
  })

  description = "The template for the container app to deploy"
}

variable "liveness_probe" {
  type = object({
    failure_count_threshold = optional(number, 5)
    header = optional(object({
      name  = string
      value = string
    }))
    host             = optional(string)
    initial_delay    = optional(number, 1)
    interval_seconds = optional(number, 10)
    path             = optional(string)
    port             = optional(number, 8080)
    timeout          = optional(number, 5)
    transport        = optional(string, "HTTP")
  })
  default     = {}
  description = "Liveness probe configuration for the container app"

  validation {
    condition     = contains(["HTTP", "TCP", "HTTPS"], var.liveness_probe.transport)
    error_message = "Valid values for transport are 'HTTP', 'TCP' and 'HTTPS'."
  }
}

variable "readiness_probe" {
  type = object({
    failure_count_threshold = optional(number, 10)
    header = optional(object({
      name  = string
      value = string
    }))
    host                    = optional(string)
    interval_seconds        = optional(number, 10)
    path                    = optional(string)
    port                    = optional(number, 8080)
    success_count_threshold = optional(number, 3)
    timeout                 = optional(number, 5)
    transport               = optional(string, "HTTP")
  })
  default     = {}
  description = "Readiness probe configuration for the container app"

  validation {
    condition     = contains(["HTTP", "TCP", "HTTPS"], var.readiness_probe.transport)
    error_message = "Valid values for transport are 'HTTP', 'TCP' and 'HTTPS'."
  }
}

variable "startup_probe" {
  type = object({
    failure_count_threshold = optional(number, 30)
    header = optional(object({
      name  = string
      value = string
    }))
    host             = optional(string)
    interval_seconds = optional(number, 10)
    path             = optional(string)
    port             = optional(number, 8080)
    timeout          = optional(number, 5)
    transport        = optional(string, "HTTP")
  })
  default     = {}
  description = "Startup probe configuration for the container app"

  validation {
    condition     = contains(["HTTP", "TCP", "HTTPS"], var.startup_probe.transport)
    error_message = "Valid values for transport are 'HTTP', 'TCP' and 'HTTPS'."
  }
}

# ------------ NETWORKING ------------ #

variable "subnet_id" {
  type        = string
  default     = null
  description = "(Optional) Set the subnet id where you want to host the Container App Environment. Mandatory if subnet_cidr is not set"
}

variable "subnet_cidr" {
  type        = string
  default     = null
  description = "(Optional) CIDR block to use for the subnet used for Container App Environment connectivity. Mandatory if subnet_id is not set"

  validation {
    condition     = var.create_container_app_environment == false || ((var.subnet_id != null) != (var.subnet_cidr != null))
    error_message = "Please specify the subnet_cidr or the subnet_id, not both"
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
  default     = null
  validation {
    condition     = var.create_container_app_environment == false || var.subnet_pep_id != null
    error_message = "Please specify the subnet_pep_id when create_container_app_environment is true"
  }
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  default     = null
  description = "Virtual network in which to create the subnet"

  validation {
    condition     = var.create_container_app_environment == false || var.virtual_network != null
    error_message = "Please specify the virtual_network when create_container_app_environment is true"
  }
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  default     = null
  description = "(Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group"
}