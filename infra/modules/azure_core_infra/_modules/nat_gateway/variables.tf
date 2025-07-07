variable "project" {
  type        = string
  description = "env prefix, short environment and short location"
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
    condition     = var.ng_number > 0 && var.ng_number <= 9
    error_message = "Number of nat gateways must be between 1 and 9."
  }
}
