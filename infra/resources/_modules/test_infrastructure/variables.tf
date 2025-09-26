variable "tests_kind" {
  type        = set(string)
  description = "List of test kinds to create resources for. Allowed values are 'integration' and 'e2e'."

  validation {
    condition     = alltrue([for v in var.tests_kind : contains(["integration", "e2e"], v)])
    error_message = "Invalid value in tests_kind. Allowed values are 'integration' and 'e2e'."
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

variable "gh_pat_reference" {
  type = object({
    keyvault_name                = string
    keyvault_resource_group_name = string
  })
}
