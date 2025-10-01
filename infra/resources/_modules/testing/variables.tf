variable "test_modes" {
  type        = set(string)
  description = "List of test kinds to create resources for. Allowed values are 'integration' and 'e2e'."

  validation {
    condition     = alltrue([for v in var.test_modes : contains(["integration", "e2e"], v)])
    error_message = "Invalid value in test_modes. Allowed values are 'integration' and 'e2e'."
  }
}

variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
}

variable "vnet_common" {
  type = object({
    name                = string
    resource_group_name = string
    id                  = string
  })
}

variable "private_dns_zone_names" {
  type        = list(string)
  description = "Map of private DNS zone names to link to the test virtual networks"
}
