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

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to use for the container app environment."
}

variable "zone_redundant" {
  type        = bool
  description = "Indicates whether the container app environment is zone redundant or not"
  default     = true
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
    condition     = (var.subnet_id != null) != (var.subnet_cidr != null)
    error_message = "Please specify the subnet_cidr or the subnet_id, not both"
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet"
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  default     = null
  description = "(Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group"
}