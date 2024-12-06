variable "project" {
  type        = string
  description = "IO prefix, short environment and short location"
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

variable "ng_ippres_number" {
  type        = number
  description = "Number of Public IP Prefix assigned to the nat gateway"
  default     = 3

  validation {
    condition     = var.ng_ippres_number > 0 && var.ng_ippres_number <= 3
    error_message = "Number of Public IP Prefix assigned to the nat gateway must be between 1 and 3."
  }
}