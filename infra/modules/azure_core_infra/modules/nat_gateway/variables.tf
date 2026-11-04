variable "project" {
  type        = string
  description = "env prefix, short environment and short location"
}

variable "instance_number" {
  type        = string
  description = "The instance number of the resource, used to differentiate multiple instances of the same resource type within the same project and environment."
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

variable "ng_number" {
  type        = number
  description = "Number of nat gateways to deploy"
  default     = 1

  validation {
    condition     = var.ng_number > 0 && var.ng_number <= 3
    error_message = "Number of nat gateways must be between 1 and 3 to match Azure availability zones."
  }
}
