variable "tags" {
  type        = map(any)
  description = "Map of tags to apply to all created resources."
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
  description = "Name of the resource group where resources will be deployed."
}

variable "app_service_plan_id" {
  type        = string
  default     = null
  description = "ID of the AppService plan where the application will be hosted."
}

variable "subnet_id" {
  type        = string
  default     = null
  description = "ID of the subnet where the application will be hosted."
}

variable "application_insights_connection_string" {
  type        = string
  sensitive   = true
  default     = null
  description = "Application Insights connection string."
}

variable "health_check_path" {
  type        = string
  description = "Path of the endpoint where health probe is exposed."
}

variable "tier" {
  type        = string
  description = "Resource tier based on workload. Allowed values: 's', 'm', 'l', 'xl'. Legacy values: 'premium', 'standard', 'test'."

  default = "l"

  validation {
    condition     = contains(["s", "m", "l", "xl", "premium", "standard", "test"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", \"l\", \"xl\". Legacy values 'premium', 'standard', or 'test' are also supported for backward compatibility."
  }
}

variable "stack" {
  type    = string
  default = "node"

  description = "Technology stack to use. Allowed values: 'node', 'java'."

  validation {
    condition     = contains(["node", "java"], var.stack)
    error_message = "Allowed values for \"stack\" are \"node\", \"java\". Note, you can select the version using \"node_version\" and \"java_version\" variables."
  }
}

variable "node_version" {
  type        = number
  default     = 20
  description = "Node.js version to use."
}

variable "java_version" {
  type        = string
  default     = 17
  description = "Java version to use."
}

variable "application_insights_sampling_percentage" {
  type        = number
  default     = 5
  description = "Sampling percentage for Application Insights. Default is 5."
}

variable "app_settings" {
  type        = map(string)
  description = "Application settings as a map of key-value pairs."
}

variable "slot_app_settings" {
  type        = map(string)
  description = "Application settings for the staging slot."
  default     = {}
}

variable "sticky_app_setting_names" {
  type        = list(string)
  description = "List of application setting names that are not swapped between slots."
  default     = []
}

variable "subnet_cidr" {
  type        = string
  default     = null
  description = "CIDR block for the subnet used by the AppService for outbound connectivity. Mandatory if 'subnet_id' is not set."

  validation {
    condition     = (var.subnet_id != null) != (var.subnet_cidr != null)
    error_message = "Please specify the subnet_cidr or the subnet_id, not both"
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "ID of the subnet hosting private endpoints."
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network where the subnet will be created."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  default     = null
  description = "Name of the resource group containing the private DNS zone for private endpoints. Default is the resource group of the virtual network."
}

variable "subnet_service_endpoints" {
  type = object({
    cosmos  = optional(bool, false)
    storage = optional(bool, false)
    web     = optional(bool, false)
  })
  description = "Enable service endpoints for the underlying subnet. Should only be set if dependencies do not use private endpoints."
  default     = null
}

variable "tls_version" {
  type        = number
  default     = 1.2
  description = "Minimum TLS version for the App Service."
}