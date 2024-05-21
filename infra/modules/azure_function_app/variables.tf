variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "env_short" {
  type        = string
  description = "Environment short name"
}

variable "location" {
  type        = string
  description = "Location name"
  default     = "italynorth"
}

variable "prefix" {
  type        = string
  description = "Project prefix"
}

variable "instance_number" {
  type        = string
  description = "(Optional) Instance count for specific resources"
  default     = "01"

  validation {
    condition     = can(regex("^(0[1-9]|[1-9][0-9])$", var.instance_number))
    error_message = "The variable \"instance_number\" only accepts values in the range [01-99]"
  }
}

variable "domain" {
  type        = string
  description = "Domain of the project"
}

variable "app_name" {
  type        = string
  description = "Name of this single application"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "app_service_plan_id" {
  type        = string
  default     = null
  description = "(Optional) Set the AppService Id where you want to host the Function App"
}

variable "application_insights_connection_string" {
  type        = string
  sensitive   = true
  description = "Application Insights connection string"
}

variable "health_check_path" {
  type        = string
  description = "Endpoint where health probe is exposed"
}

variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload. Allowed values are 'premium', 'standard', 'test'. Note, \"test\" does not support deployment slots."
  default     = "premium"

  validation {
    condition     = contains(["premium", "standard", "test"], var.tier)
    error_message = "Allowed values for \"tier\" are \"premium\", \"standard\", or \"test\". Note, \"test\" does not support deployment slots."
  }
}

variable "stack" {
  type    = string
  default = "node"

  validation {
    condition     = contains(["node", "java"], var.stack)
    error_message = "Allowed values for \"stack\" are \"node\", \"java\". Note, you can select the version using \"node_version\" and \"java_version\" variables."
  }
}

variable "node_version" {
  type        = number
  default     = 20
  description = "Node version to use"
}

variable "java_version" {
  type        = string
  default     = 17
  description = "Java version to use"
}

variable "ai_sampling_percentage" {
  type        = number
  default     = 5
  description = "(Optional) The sampling percentage of Application Insights. Default is 5"
}

variable "app_settings" {
  type        = map(string)
  description = "Application settings"
}

variable "sticky_app_setting_names" {
  type        = list(string)
  description = "(Optional) A list of application setting names that are not swapped between slots"
  default     = []
}

variable "subnet_cidr" {
  type        = string
  description = "CIDR block to use for the subnet the Function App uses for outbound connectivity"
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
