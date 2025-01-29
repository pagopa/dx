variable "project" {
  type        = string
  description = "env prefix, short environment and short location"
}

variable "prefix" {
  type        = string
  description = "env prefix, short environment and short location amd domain"
}

variable "suffix" {
  type        = string
  description = "the instance number"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Location"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload. Allowed values are 's', 'm', 'l'."
  default     = "s"

  validation {
    condition     = contains(["s", "m", "l"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", or \"l\"."
  }
}

variable "publisher_name" {
  type        = string
  description = "The name of publisher/company."
}

variable "publisher_email" {
  type        = string
  description = "The email of publisher/company."
}

variable "enable_public_network_access" {
  type        = bool
  description = "Enable public network access"
  default     = false
}

variable "virtual_network_type_internal" {
  type        = bool
  description = "The type of virtual network you want to use, if true it will be Internal and you need to specify a subnet_id, otherwise it will be None"
  default     = true
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet"
}

variable "autoscale" {
  type = object(
    {
      enabled                       = bool
      default_instances             = number
      minimum_instances             = number
      maximum_instances             = number
      scale_out_capacity_percentage = number
      scale_out_time_window         = string
      scale_out_value               = string
      scale_out_cooldown            = string
      scale_in_capacity_percentage  = number
      scale_in_time_window          = string
      scale_in_value                = string
      scale_in_cooldown             = string
    }
  )
  default = {
    enabled                       = true
    default_instances             = 1
    minimum_instances             = 1
    maximum_instances             = 5
    scale_out_capacity_percentage = 60
    scale_out_time_window         = "PT10M"
    scale_out_value               = "2"
    scale_out_cooldown            = "PT45M"
    scale_in_capacity_percentage  = 30
    scale_in_time_window          = "PT30M"
    scale_in_value                = "1"
    scale_in_cooldown             = "PT30M"
  }
  description = "Configure Apim autoscale rule on capacity metric"
}

variable "subnet_cidr" {
  type        = string
  description = "The CIDR block for the subnet"
}