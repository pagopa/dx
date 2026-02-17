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

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to use for the container app environment."
}

# ------------ NETWORKING ------------ #

variable "subnet_id" {
  type        = string
  default     = null
  description = "The ID of the subnet where the Container App Environment will be hosted. This is required if 'subnet_cidr' is not specified."
}

variable "subnet_cidr" {
  type        = string
  default     = null
  description = "The CIDR block for the subnet used for Container App Environment connectivity. This is required if 'subnet_id' is not specified."

  validation {
    condition     = (var.subnet_id != null) != (var.subnet_cidr != null)
    error_message = "Specify either 'subnet_cidr' or 'subnet_id', but not both."
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet designated for hosting private endpoints."
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  default = {
    name                = null
    resource_group_name = null
  }
  description = "An object defining the virtual network where the subnet will be created."

  validation {
    condition     = (var.subnet_id != null) != (var.virtual_network.name != null && var.virtual_network.resource_group_name != null)
    error_message = "Specify the subnet_id or the virtual_network.name and virtual_network.resource_group_name, not both"
  }
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  default     = null
  description = "The name of the resource group containing the private DNS zone for private endpoints. Defaults to the resource group of the Virtual Network if not specified."
}

# ------------ MONITORING & COMPLIANCE ------------ #
variable "diagnostic_settings" {
  type = object({
    enabled                    = bool
    log_analytics_workspace_id = optional(string, null)
    storage_account_id         = optional(string, null)
  })
  description = "Diagnostic settings for Container App Environment logs and metrics. When enabled, sends diagnostics to Log Analytics workspace and/or Storage Account."
  default = {
    enabled                    = false
    log_analytics_workspace_id = null
  }

  validation {
    condition = (
      !var.diagnostic_settings.enabled ||
      var.diagnostic_settings.log_analytics_workspace_id != null ||
      var.diagnostic_settings.storage_account_id != null
    )
    error_message = "Either log_analytics_workspace_id or storage_account_id must be provided when diagnostic settings are enabled."
  }
}
